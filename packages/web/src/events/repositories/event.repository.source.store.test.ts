import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

const getEventRepositorySource = mock((sessionExists: boolean) =>
  sessionExists ? "remote" : "local",
);

// Only getEventRepositorySource is under test here (the only export
// event.repository.source.store.ts actually consumes) — spread the real
// module's other exports (getEventRepository, getEventRepositoryBySource)
// rather than stubbing them with bare `mock()`s. mock.module is process-wide
// and not reliably restorable, so a bare stub here would permanently return
// undefined for unrelated consumers elsewhere (e.g. useEventMutations.ts's
// getEventRepositoryBySource) for the rest of the test run.
const actualEventRepositoryUtil = await import(
  "@web/events/repositories/event.repository.util"
);

mock.module("@web/events/repositories/event.repository.util", () => ({
  ...actualEventRepositoryUtil,
  getEventRepositorySource,
}));

const { refreshEventRepositorySource, useEventRepositorySource } =
  require("./event.repository.source.store") as typeof import("./event.repository.source.store");

describe("event repository source store", () => {
  it("flips the source and notifies subscribers on refresh", () => {
    const { result } = renderHook(() => useEventRepositorySource());

    // First use computes lazily from the remembered session flag (false).
    expect(result.current).toBe("local");

    act(() => refreshEventRepositorySource(true));
    expect(result.current).toBe("remote");

    act(() => refreshEventRepositorySource(false));
    expect(result.current).toBe("local");
  });

  it("reuses the remembered session flag when none is passed", () => {
    const { result } = renderHook(() => useEventRepositorySource());

    act(() => refreshEventRepositorySource(true));
    expect(result.current).toBe("remote");

    // No arg → recompute with the last remembered flag (true → remote).
    act(() => refreshEventRepositorySource());
    expect(result.current).toBe("remote");
  });
});
