import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import {
  getOnboardingProgress,
  updateOnboardingProgress,
} from "@web/views/Onboarding/utils/onboardingStorage.util";
import { useOnboardingOverlays } from "./useOnboardingOverlays";

// Mock useSession
jest.mock("@web/common/hooks/useSession", () => ({
  useSession: jest.fn(() => ({ authenticated: false })),
}));

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
  });

  it("should show onboarding overlay for unauthenticated users when guide is active on step 1", async () => {
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useOnboardingOverlays({
          tasks: [],
          hasNavigatedDates: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    await waitFor(() => {
      expect(result.current.showOnboardingOverlay).toBe(true);
    });
  });

  it("should not show onboarding overlay if guide is completed", () => {
    updateOnboardingProgress({ isCompleted: true });
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useOnboardingOverlays({
          tasks: [],
          hasNavigatedDates: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showOnboardingOverlay).toBe(false);
  });

  it("should show cmd palette tutorial after onboarding overlay is dismissed", async () => {
    updateOnboardingProgress({ isCompleted: true });
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useOnboardingOverlays({
          tasks: [],
          hasNavigatedDates: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    await waitFor(
      () => {
        expect(result.current.showCmdPaletteTutorial).toBe(true);
      },
      { timeout: 2000 },
    );
  });

  it("should not show cmd palette tutorial if already seen", () => {
    updateOnboardingProgress({ isSeen: true, isCompleted: true });
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useOnboardingOverlays({
          tasks: [],
          hasNavigatedDates: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showCmdPaletteTutorial).toBe(false);
  });

  it("should show auth prompt after user creates 2+ tasks", async () => {
    updateOnboardingProgress({ isCompleted: true, isSeen: true });
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useOnboardingOverlays({
          tasks: [{ id: "1" }, { id: "2" }],
          hasNavigatedDates: false,
        }),
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

    const { result } = renderHook(
      () =>
        useOnboardingOverlays({
          tasks: [],
          hasNavigatedDates: true,
        }),
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

  it("should not show auth prompt if dismissed", () => {
    updateOnboardingProgress({
      isAuthDismissed: true,
      isCompleted: true,
      isSeen: true,
    });
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useOnboardingOverlays({
          tasks: [{ id: "1" }, { id: "2" }],
          hasNavigatedDates: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showAuthPrompt).toBe(false);
  });

  it("should mark cmd palette as used when opened", async () => {
    updateOnboardingProgress({ isCompleted: true });
    const store = createTestStore(true); // cmd palette is open

    const { result } = renderHook(
      () =>
        useOnboardingOverlays({
          tasks: [],
          hasNavigatedDates: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    // Wait for the effect to run and mark tutorial as seen
    await waitFor(
      () => {
        const progress = getOnboardingProgress();
        expect(progress.isSeen).toBe(true);
        expect(result.current.showCmdPaletteTutorial).toBe(false);
      },
      { timeout: 3000 },
    );
  });

  it("should dismiss onboarding overlay and skip guide", async () => {
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useOnboardingOverlays({
          tasks: [],
          hasNavigatedDates: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

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
