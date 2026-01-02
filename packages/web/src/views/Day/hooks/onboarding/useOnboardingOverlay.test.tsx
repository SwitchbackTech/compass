import { act, renderHook, waitFor } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { useOnboardingOverlay } from "./useOnboardingOverlay";

// Mock useSession
jest.mock("@web/common/hooks/useSession", () => ({
  useSession: jest.fn(() => ({ authenticated: false })),
}));

describe("useOnboardingOverlay", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should show onboarding overlay for unauthenticated users who haven't seen it", async () => {
    const { result } = renderHook(() => useOnboardingOverlay());

    await waitFor(() => {
      expect(result.current.showOnboardingOverlay).toBe(true);
    });
  });

  it("should not show onboarding overlay if already seen", () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_OVERLAY_SEEN, "true");

    const { result } = renderHook(() => useOnboardingOverlay());

    expect(result.current.showOnboardingOverlay).toBe(false);
  });

  it("should not show onboarding overlay for authenticated users", () => {
    const { useSession } = require("@web/common/hooks/useSession");
    useSession.mockReturnValue({ authenticated: true });

    const { result } = renderHook(() => useOnboardingOverlay());

    expect(result.current.showOnboardingOverlay).toBe(false);
  });

  it("should dismiss onboarding overlay", async () => {
    // Reset mock to ensure authenticated is false
    const { useSession } = require("@web/common/hooks/useSession");
    useSession.mockReturnValue({ authenticated: false });

    const { result } = renderHook(() => useOnboardingOverlay());

    // Wait for overlay to show first
    await waitFor(
      () => {
        expect(result.current.showOnboardingOverlay).toBe(true);
      },
      { timeout: 2000 },
    );

    act(() => {
      result.current.dismissOnboardingOverlay();
    });

    expect(result.current.showOnboardingOverlay).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_OVERLAY_SEEN)).toBe(
      "true",
    );
  });
});
