import { act, renderHook } from "@testing-library/react";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const clearAuthenticationState = mock();
const setAuthenticated = mock();
const signOut = mock();
const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  clearAuthenticationState,
}));

mock.module("@web/common/classes/Session", () => ({
  session: {
    signOut,
  },
}));

const { useLogout } = await import("./useLogout");

describe("useLogout", () => {
  beforeEach(() => {
    clearAuthenticationState.mockClear();
    setAuthenticated.mockClear();
    signOut.mockReset();
    mockUseSession.mockReset();
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated,
    });
    signOut.mockResolvedValue(undefined);
  });

  it("signs out and clears authenticated state immediately", () => {
    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current();
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(clearAuthenticationState).toHaveBeenCalledTimes(1);
    expect(setAuthenticated).toHaveBeenCalledWith(false);
  });

  it("does not wait for backend sign-out before clearing local state", () => {
    signOut.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current();
    });

    expect(clearAuthenticationState).toHaveBeenCalledTimes(1);
    expect(setAuthenticated).toHaveBeenCalledWith(false);
  });

  it("logs backend sign-out failures after local logout completes", async () => {
    const consoleWarn = spyOn(console, "warn").mockImplementation(() => {});
    const error = new Error("network");
    signOut.mockRejectedValue(error);
    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current();
    });

    await Promise.resolve();

    expect(clearAuthenticationState).toHaveBeenCalledTimes(1);
    expect(setAuthenticated).toHaveBeenCalledWith(false);
    expect(consoleWarn).toHaveBeenCalledWith(
      "Failed to complete backend sign-out:",
      error,
    );

    consoleWarn.mockRestore();
  });
});

afterAll(() => {
  mock.restore();
});
