import { renderHook } from "@testing-library/react";
import { act } from "react";
import { type AppAccess } from "@web/billing/useAppAccess";
import {
  selectIsSettingsOpen,
  useSettingsStore,
} from "@web/settings/settings.store";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

// Mocked rather than wrapped in a QueryClient: the badge is the only thing
// this hook reads billing for, and driving the access state directly is what
// the assertions are about.
let access: AppAccess = { kind: "open" };
mock.module("@web/billing/useAppAccess", () => ({
  useAppAccess: () => access,
}));

const { useShowAccountsCmdItems } = await import("./useShowAccountsCmdItems");

describe("useShowAccountsCmdItems", () => {
  beforeEach(() => {
    useSettingsStore.setState({ isSettingsOpen: false });
    access = { kind: "open" };
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

    const { result } = renderHook(() => useShowAccountsCmdItems());

    expect(result.current).toEqual([]);
  });

  it("opens the settings modal from the command palette item", () => {
    const { result } = renderHook(() => useShowAccountsCmdItems());

    expect(result.current[0].label).toBe("Manage Accounts");
    expect(result.current[0].keywords).toContain("accounts");

    act(() => {
      result.current[0].onClick?.();
    });

    expect(selectIsSettingsOpen(useSettingsStore.getState())).toBe(true);
  });

  it("carries no badge on an install without billing", () => {
    const { result } = renderHook(() => useShowAccountsCmdItems());

    expect(result.current[0].badge).toBeUndefined();
  });

  it("shows the plan on the row so it is visible without opening Settings", () => {
    access = {
      kind: "server",
      status: "active",
      isReadOnly: false,
      trialEndsAt: null,
    };

    const { result } = renderHook(() => useShowAccountsCmdItems());

    expect(result.current[0].badge).toBe("Premium");
  });
});
