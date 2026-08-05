import { renderHook } from "@testing-library/react";
import { act } from "react";
import {
  selectIsSettingsOpen,
  useSettingsStore,
} from "@web/settings/settings.store";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

const { useShowAccountsCmdItems } = await import("./useShowAccountsCmdItems");

describe("useShowAccountsCmdItems", () => {
  beforeEach(() => {
    useSettingsStore.setState({ isSettingsOpen: false });
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

    expect(result.current[0].label).toBe("Show accounts");

    act(() => {
      result.current[0].onClick?.();
    });

    expect(selectIsSettingsOpen(useSettingsStore.getState())).toBe(true);
  });
});
