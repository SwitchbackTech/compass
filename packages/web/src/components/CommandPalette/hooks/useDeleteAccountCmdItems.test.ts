import { renderHook } from "@testing-library/react";
import { act, createElement, type PropsWithChildren } from "react";
import { DeleteAccountConfirmationContext } from "@web/components/DeleteAccountConfirmation/hooks/useDeleteAccountConfirmation";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenDeleteAccountConfirmation = mock();
const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

const { useDeleteAccountCmdItems } = await import("./useDeleteAccountCmdItems");

// useDeleteAccountConfirmation has its own dedicated test
// (DeleteAccountConfirmationProvider.test.tsx) that imports the real module —
// mock.module leaks process-wide across files, so mocking it here would
// starve that later test. Supply a fake value through the real context
// instead.
function wrapper({ children }: PropsWithChildren) {
  return createElement(
    DeleteAccountConfirmationContext.Provider,
    {
      value: {
        isOpen: false,
        closeDeleteAccountConfirmation: mock(),
        openDeleteAccountConfirmation: mockOpenDeleteAccountConfirmation,
      },
    },
    children,
  );
}

describe("useDeleteAccountCmdItems", () => {
  beforeEach(() => {
    mockOpenDeleteAccountConfirmation.mockClear();
    mockUseSession.mockReset();
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

    const { result } = renderHook(() => useDeleteAccountCmdItems(), {
      wrapper,
    });

    expect(result.current).toEqual([]);
  });

  it("opens the delete account confirmation from the command palette item", () => {
    const { result } = renderHook(() => useDeleteAccountCmdItems(), {
      wrapper,
    });

    act(() => {
      result.current[0].onClick?.();
    });

    expect(mockOpenDeleteAccountConfirmation).toHaveBeenCalledTimes(1);
  });
});
