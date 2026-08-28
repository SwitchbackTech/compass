import { renderHook } from "@testing-library/react";
import { act } from "react";
import { type AppAccess } from "@web/billing/useAppAccess";
import {
  selectIsSettingsOpen,
  selectSettingsPage,
  useSettingsStore,
} from "@web/settings/settings.store";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

let access: AppAccess = { kind: "open" };
mock.module("@web/billing/useAppAccess", () => ({
  useAppAccess: () => access,
}));

const { useShowBillingCmdItems } = await import("./useShowBillingCmdItems");

describe("useShowBillingCmdItems", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      isSettingsOpen: false,
      settingsPage: "accounts",
    });
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

    const { result } = renderHook(() => useShowBillingCmdItems());

    expect(result.current).toEqual([]);
  });

  it("returns no items on an install without billing", () => {
    const { result } = renderHook(() => useShowBillingCmdItems());

    expect(result.current).toEqual([]);
  });

  it("opens Settings on Billing and shows the plan badge", () => {
    access = {
      kind: "server",
      status: "active",
      isReadOnly: false,
      trialEndsAt: null,
    };

    const { result } = renderHook(() => useShowBillingCmdItems());

    expect(result.current[0].label).toBe("Manage Billing");
    expect(result.current[0].badge).toBe("Premium");

    act(() => {
      result.current[0].onClick?.();
    });

    expect(selectIsSettingsOpen(useSettingsStore.getState())).toBe(true);
    expect(selectSettingsPage(useSettingsStore.getState())).toBe("billing");
  });
});
