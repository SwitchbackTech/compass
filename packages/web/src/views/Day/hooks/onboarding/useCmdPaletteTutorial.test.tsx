import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, renderHook, waitFor } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useCmdPaletteTutorial } from "./useCmdPaletteTutorial";

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

describe("useCmdPaletteTutorial", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should show cmd palette tutorial after onboarding overlay is dismissed", async () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_OVERLAY_SEEN, "true");
    const store = createTestStore();

    const { result } = renderHook(
      () => useCmdPaletteTutorial({ showOnboardingOverlay: false }),
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

  it("should not show cmd palette tutorial if onboarding overlay is still showing", () => {
    const store = createTestStore();

    const { result } = renderHook(
      () => useCmdPaletteTutorial({ showOnboardingOverlay: true }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showCmdPaletteTutorial).toBe(false);
  });

  it("should not show cmd palette tutorial if already seen", () => {
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN, "true");
    const store = createTestStore();

    const { result } = renderHook(
      () => useCmdPaletteTutorial({ showOnboardingOverlay: false }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showCmdPaletteTutorial).toBe(false);
  });

  it("should not show cmd palette tutorial for authenticated users", () => {
    const { useSession } = require("@web/common/hooks/useSession");
    useSession.mockReturnValue({ authenticated: true });
    const store = createTestStore();

    const { result } = renderHook(
      () => useCmdPaletteTutorial({ showOnboardingOverlay: false }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showCmdPaletteTutorial).toBe(false);
  });

  it("should mark cmd palette as used when opened", async () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_OVERLAY_SEEN, "true");
    // Reset mock to ensure authenticated is false
    const { useSession } = require("@web/common/hooks/useSession");
    useSession.mockReturnValue({ authenticated: false });

    const store = createTestStore(false); // cmd palette starts closed

    const { result, rerender } = renderHook(
      ({ showOnboardingOverlay }) =>
        useCmdPaletteTutorial({ showOnboardingOverlay }),
      {
        initialProps: { showOnboardingOverlay: false },
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    // Wait for tutorial to show (has 1 second delay)
    await waitFor(
      () => {
        expect(result.current.showCmdPaletteTutorial).toBe(true);
      },
      { timeout: 2500 },
    );

    // Now open cmd palette
    act(() => {
      store.dispatch(settingsSlice.actions.toggleCmdPalette());
    });

    // Wait for the effect to run and mark tutorial as seen
    await waitFor(
      () => {
        expect(
          localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN),
        ).toBe("true");
        expect(result.current.showCmdPaletteTutorial).toBe(false);
      },
      { timeout: 1000 },
    );
  });

  it("should dismiss cmd palette tutorial", () => {
    const store = createTestStore();

    const { result } = renderHook(
      () => useCmdPaletteTutorial({ showOnboardingOverlay: false }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    result.current.dismissCmdPaletteTutorial();
    expect(result.current.showCmdPaletteTutorial).toBe(false);
  });

  it("should mark cmd palette as used when markCmdPaletteUsed is called", () => {
    const store = createTestStore();

    const { result } = renderHook(
      () => useCmdPaletteTutorial({ showOnboardingOverlay: false }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    result.current.markCmdPaletteUsed();

    expect(localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN)).toBe(
      "true",
    );
    expect(result.current.showCmdPaletteTutorial).toBe(false);
  });
});
