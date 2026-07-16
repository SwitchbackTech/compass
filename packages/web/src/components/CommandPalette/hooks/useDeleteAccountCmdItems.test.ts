import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenDeleteAccountConfirmation = mock();
const mockUseDeleteAccountConfirmation = mock();
const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module(
  "@web/components/DeleteAccountConfirmation/hooks/useDeleteAccountConfirmation",
  () => ({
    useDeleteAccountConfirmation: mockUseDeleteAccountConfirmation,
  }),
);

const { useDeleteAccountCmdItems } = await import("./useDeleteAccountCmdItems");

describe("useDeleteAccountCmdItems", () => {
  beforeEach(() => {
    mockOpenDeleteAccountConfirmation.mockClear();
    mockUseDeleteAccountConfirmation.mockReset();
    mockUseSession.mockReset();
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: mock(),
    });
    mockUseDeleteAccountConfirmation.mockReturnValue({
      openDeleteAccountConfirmation: mockOpenDeleteAccountConfirmation,
    });
  });

  it("returns no items when logged out", () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mock(),
    });

    const { result } = renderHook(() => useDeleteAccountCmdItems());

    expect(result.current).toEqual([]);
  });

  it("opens the delete account confirmation from the command palette item", () => {
    const { result } = renderHook(() => useDeleteAccountCmdItems());

    act(() => {
      result.current[0].onClick?.();
    });

    expect(mockOpenDeleteAccountConfirmation).toHaveBeenCalledTimes(1);
  });
});
