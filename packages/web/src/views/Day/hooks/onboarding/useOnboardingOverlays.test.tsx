import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
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
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
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
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
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
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN, "true");
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
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
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN, "true");
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
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN, "true");
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
    localStorage.setItem(STORAGE_KEYS.AUTH_PROMPT_DISMISSED, "true");
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN, "true");
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
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
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
        const tutorialSeen = localStorage.getItem(
          STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN,
        );
        expect(tutorialSeen).toBe("true");
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
      expect(
        localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED),
      ).toBe("true");
    });
  });
});
