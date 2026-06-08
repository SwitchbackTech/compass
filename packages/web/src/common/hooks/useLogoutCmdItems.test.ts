import { renderHook } from "@testing-library/react";
import { act, type MouseEvent } from "react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenLogoutConfirmation = mock();
const mockUseLogoutConfirmation = mock();
const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module(
  "@web/components/LogoutConfirmation/hooks/useLogoutConfirmation",
  () => ({
    useLogoutConfirmation: mockUseLogoutConfirmation,
  }),
);

const { useLogoutCmdItems } = await import("./useLogoutCmdItems");

describe("useLogoutCmdItems", () => {
  beforeEach(() => {
    mockOpenLogoutConfirmation.mockClear();
    mockUseLogoutConfirmation.mockReset();
    mockUseSession.mockReset();
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: mock(),
    });
    mockUseLogoutConfirmation.mockReturnValue({
      openLogoutConfirmation: mockOpenLogoutConfirmation,
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

  it("opens logout confirmation from the command palette item", () => {
    const { result } = renderHook(() => useLogoutCmdItems());
    const logoutItem = result.current[0];

    act(() => {
      logoutItem.onClick?.({} as MouseEvent<HTMLButtonElement>);
    });

    expect(mockOpenLogoutConfirmation).toHaveBeenCalledTimes(1);
  });
});
