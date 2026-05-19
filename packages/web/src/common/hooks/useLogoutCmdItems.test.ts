import { renderHook } from "@testing-library/react";
import { act, type MouseEvent } from "react";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const logout = mock();
const mockUseLogout = mock();
const mockUseSession = mock();

mock.module("@web/auth/compass/hooks/useLogout", () => ({
  useLogout: mockUseLogout,
}));

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

const { useLogoutCmdItems } = await import("./useLogoutCmdItems");

describe("useLogoutCmdItems", () => {
  beforeEach(() => {
    logout.mockClear();
    mockUseLogout.mockReset();
    mockUseSession.mockReset();
    mockUseLogout.mockReturnValue(logout);
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: mock(),
    });
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

    expect(logout).toHaveBeenCalledTimes(1);
  });
});

afterAll(() => {
  mock.restore();
});
