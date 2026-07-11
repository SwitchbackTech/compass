import { act, renderHook } from "@testing-library/react";
import { afterAll, describe, expect, it, mock } from "bun:test";

const mockGetEventRepositorySource = mock((sessionExists: boolean) =>
  sessionExists ? "remote" : "local",
);

// Only getEventRepositorySource is under test here (the only export
// event.repository.source.store.ts actually consumes) — spread the real
// module's other exports (getEventRepository, getEventRepositoryBySource)
// rather than stubbing them with bare `mock()`s. mock.module is process-wide
// and not reliably restorable, so a bare stub here would permanently return
// undefined for unrelated consumers elsewhere (e.g. useEventMutations.ts's
// getEventRepositoryBySource) for the rest of the test run. The override for
// getEventRepositorySource itself also needs a flag+restore: any other file
// that resolves a repository source (e.g. usePrefetchAdjacentEvents.test.ts,
// via useEventRepositorySource) would otherwise get this test's mock
// permanently, keying its query cache under the wrong source.
const actualEventRepositoryUtil = await import(
  "@web/events/repositories/event.repository.util"
);
let isSourceMocked = true;

mock.module("@web/events/repositories/event.repository.util", () => ({
  ...actualEventRepositoryUtil,
  getEventRepositorySource: (sessionExists: boolean) =>
    isSourceMocked
      ? mockGetEventRepositorySource(sessionExists)
      : actualEventRepositoryUtil.getEventRepositorySource(sessionExists),
}));

const { refreshEventRepositorySource, useEventRepositorySource } =
  require("./event.repository.source.store") as typeof import("./event.repository.source.store");

// event.repository.source.store.ts is a process-lifetime singleton (lazy
// `hasComputed` seeded to "local", see its own comment on why) — this test
// flips it to "remote" without the app's normal auth-transition trigger, so
// it must flip it back, or any later file that calls useEventRepositorySource
// (e.g. usePrefetchAdjacentEvents.test.ts) inherits "remote" and keys its
// query cache under the wrong source. Reset while isSourceMocked is still
// true so this uses our own deterministic mock, then restore the real
// getEventRepositorySource for whoever resolves a source after this file.
afterAll(() => {
  refreshEventRepositorySource(false);
  isSourceMocked = false;
});

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
