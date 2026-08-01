import { renderHook } from "@testing-library/react";
import { act } from "react";
import { type UseConnectGoogleResult } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { useSyncFocusRefresh } from "@web/sse/hooks/useSyncFocusRefresh";
import { afterEach, describe, expect, it, mock, setSystemTime } from "bun:test";

const MIN_HIDDEN_DURATION_MS = 30_000;

const fakeConnectGoogle = (
  overrides: Partial<UseConnectGoogleResult> = {},
): UseConnectGoogleResult => ({
  commandAction: null,
  isAvailable: true,
  isConnecting: false,
  isRefreshing: false,
  state: "HEALTHY",
  connect: mock(),
  refresh: mock(),
  ...overrides,
});

describe("useSyncFocusRefresh", () => {
  let visibilityState = "visible";

  const setVisibility = (state: "visible" | "hidden") => {
    visibilityState = state;
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  };

  afterEach(() => {
    visibilityState = "visible";
    setSystemTime();
  });

  it("refreshes on mount for a healthy connection", () => {
    const refresh = mock();
    renderHook(() => useSyncFocusRefresh(() => fakeConnectGoogle({ refresh })));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes on mount for an ATTENTION connection", () => {
    const refresh = mock();
    renderHook(() =>
      useSyncFocusRefresh(() =>
        fakeConnectGoogle({ refresh, state: "ATTENTION" }),
      ),
    );

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    "NOT_CONNECTED",
    "RECONNECT_REQUIRED",
    "IMPORTING",
  ] as const)("does not refresh on mount for %s", (state) => {
    const refresh = mock();
    renderHook(() =>
      useSyncFocusRefresh(() => fakeConnectGoogle({ refresh, state })),
    );

    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not refresh when Google is unavailable", () => {
    const refresh = mock();
    renderHook(() =>
      useSyncFocusRefresh(() =>
        fakeConnectGoogle({ refresh, isAvailable: false }),
      ),
    );

    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes again when the tab regains focus after being hidden long enough", () => {
    setSystemTime(new Date("2026-02-05T00:00:00.000Z"));
    const refresh = mock();
    renderHook(() => useSyncFocusRefresh(() => fakeConnectGoogle({ refresh })));
    refresh.mockClear();

    act(() => {
      setVisibility("hidden");
      setSystemTime(new Date(Date.now() + MIN_HIDDEN_DURATION_MS + 1_000));
      setVisibility("visible");
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on a short hide", () => {
    setSystemTime(new Date("2026-02-05T00:00:00.000Z"));
    const refresh = mock();
    renderHook(() => useSyncFocusRefresh(() => fakeConnectGoogle({ refresh })));
    refresh.mockClear();

    act(() => {
      setVisibility("hidden");
      setSystemTime(new Date(Date.now() + MIN_HIDDEN_DURATION_MS - 1_000));
      setVisibility("visible");
    });

    expect(refresh).not.toHaveBeenCalled();
  });
});
