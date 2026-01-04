import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import {
  getOnboardingProgress,
  updateOnboardingProgress,
} from "@web/views/Onboarding/utils/onboarding.storage.util";
import { useOnboardingOverlays } from "./useOnboardingOverlays";

// Mock useSession
jest.mock("@web/common/hooks/useSession", () => ({
  useSession: jest.fn(() => ({ authenticated: false })),
}));

jest.mock("@web/views/Onboarding/hooks/useOnboardingProgress", () => ({
  useOnboardingProgress: jest.fn(),
}));

const mockUseOnboardingProgress = jest.requireMock(
  "@web/views/Onboarding/hooks/useOnboardingProgress",
).useOnboardingProgress as jest.MockedFunction<
  typeof import("@web/views/Onboarding/hooks/useOnboardingProgress").useOnboardingProgress
>;

const createTestStore = (isCmdPaletteOpen = false) => {
  return configureStore({
    reducer: {
      settings: settingsSlice.reducer,
    },
    preloadedState: {
      settings: {
        isCmdPaletteOpen: isCmdPaletteOpen,
      },
    },
  });
};

describe("useOnboardingOverlays", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseOnboardingProgress.mockReturnValue({ hasNavigatedDates: false });
  });

  it("should show onboarding overlay for unauthenticated users when guide is active on step 1", async () => {
    const store = createTestStore();

    const { result } = renderHook(() => useOnboardingOverlays({ tasks: [] }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    await waitFor(() => {
      expect(result.current.showOnboardingOverlay).toBe(true);
    });
  });

  it("should not show onboarding overlay if guide is completed", () => {
    updateOnboardingProgress({ isCompleted: true });
    const store = createTestStore();

    const { result } = renderHook(() => useOnboardingOverlays({ tasks: [] }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(result.current.showOnboardingOverlay).toBe(false);
  });

  it("should show auth prompt after user creates 2+ tasks", async () => {
    updateOnboardingProgress({ isCompleted: true, isSeen: true });
    const store = createTestStore();

    const { result } = renderHook(
      () => useOnboardingOverlays({ tasks: [{ id: "1" }, { id: "2" }] }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    await waitFor(
      () => {
        expect(result.current.showAuthPrompt).toBe(true);
      },
      { timeout: 3000 },
    );
  });

  it("should show auth prompt after user navigates dates", async () => {
    updateOnboardingProgress({ isCompleted: true, isSeen: true });
    const store = createTestStore();

    mockUseOnboardingProgress.mockReturnValue({ hasNavigatedDates: true });

    const { result } = renderHook(() => useOnboardingOverlays({ tasks: [] }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    await waitFor(
      () => {
        expect(result.current.showAuthPrompt).toBe(true);
      },
      { timeout: 3000 },
    );
  });

  it("should not show auth prompt if dismissed", () => {
    updateOnboardingProgress({
      isAuthDismissed: true,
      isCompleted: true,
      isSeen: true,
    });
    const store = createTestStore();

    const { result } = renderHook(
      () => useOnboardingOverlays({ tasks: [{ id: "1" }, { id: "2" }] }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showAuthPrompt).toBe(false);
  });

  it("should dismiss onboarding overlay and skip guide", async () => {
    const store = createTestStore();

    const { result } = renderHook(() => useOnboardingOverlays({ tasks: [] }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    // Wait for overlay to show first
    await waitFor(() => {
      expect(result.current.showOnboardingOverlay).toBe(true);
    });

    result.current.dismissOnboardingOverlay();

    await waitFor(() => {
      expect(result.current.showOnboardingOverlay).toBe(false);
      const progress = getOnboardingProgress();
      expect(progress.isCompleted).toBe(true);
    });
  });
});
