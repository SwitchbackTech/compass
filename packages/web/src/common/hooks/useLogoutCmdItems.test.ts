import { renderHook } from "@testing-library/react";
import { act, type MouseEvent } from "react";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const clearAuthenticationState = mock();
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

const { useLogoutCmdItems } = await import("./useLogoutCmdItems");

describe("useLogoutCmdItems", () => {
  beforeEach(() => {
    clearAuthenticationState.mockClear();
    signOut.mockReset();
    mockUseSession.mockReset();
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: mock(),
    });
    signOut.mockResolvedValue(undefined);
  });

  it("returns no items when logged out", () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mock(),
    });

    const { result } = renderHook(() => useLogoutCmdItems());

    expect(result.current).toEqual([]);
  });

  it("logs out from the command palette item", () => {
    const { result } = renderHook(() => useLogoutCmdItems());
    const logoutItem = result.current[0];

    act(() => {
      logoutItem.onClick?.({} as MouseEvent<HTMLButtonElement>);
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(clearAuthenticationState).toHaveBeenCalledTimes(1);
  });
});

afterAll(() => {
  mock.restore();
});
