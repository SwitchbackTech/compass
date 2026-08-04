import { renderHook } from "@testing-library/react";
import { act, createElement, type PropsWithChildren } from "react";
import { ManageAccountsContext } from "@web/components/ManageAccounts/hooks/useManageAccounts";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenManageAccounts = mock();
const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

const { useManageAccountsCmdItems } = await import(
  "./useManageAccountsCmdItems"
);

// ManageAccounts has its own dedicated tests (ManageAccountsDialog.test.tsx)
// that import the real module - mock.module leaks process-wide across
// files, so mocking it here would starve that later test. Supply a fake
// value through the real context instead.
function wrapper({ children }: PropsWithChildren) {
  return createElement(
    ManageAccountsContext.Provider,
    {
      value: {
        isOpen: false,
        closeManageAccounts: mock(),
        openManageAccounts: mockOpenManageAccounts,
      },
    },
    children,
  );
}

describe("useManageAccountsCmdItems", () => {
  beforeEach(() => {
    mockOpenManageAccounts.mockClear();
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

    const { result } = renderHook(() => useManageAccountsCmdItems(), {
      wrapper,
    });

    expect(result.current).toEqual([]);
  });

  it("opens the manage-accounts dialog from the command palette item", () => {
    const { result } = renderHook(() => useManageAccountsCmdItems(), {
      wrapper,
    });

    expect(result.current[0].label).toBe("Add/remove accounts");

    act(() => {
      result.current[0].onClick?.();
    });

    expect(mockOpenManageAccounts).toHaveBeenCalledTimes(1);
  });
});
