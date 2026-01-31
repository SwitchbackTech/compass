import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, renderHook, waitFor } from "@testing-library/react";
import { CompassSession } from "@web/auth/session/session.types";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import {
  getOnboardingProgress,
  updateOnboardingProgress,
} from "@web/views/Onboarding/utils/onboarding.storage.util";
import { useCmdPaletteTutorial } from "./useCmdPaletteTutorial";

// Mock useSession
jest.mock("@web/auth/hooks/useSession", () => ({
  useSession: jest.fn(() => ({
    authenticated: false,
    loading: false,
    isSyncing: false,
    setAuthenticated: jest.fn(),
    setLoading: jest.fn(),
    setIsSyncing: jest.fn(),
  })),
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

  it("should not show cmd palette tutorial for authenticated users", () => {
    const { useSession } = require("@web/auth/hooks/useSession");
    const mockSession: CompassSession = {
      authenticated: true,
      loading: false,
      isSyncing: false,
      setAuthenticated: jest.fn(),
      setLoading: jest.fn(),
      setIsSyncing: jest.fn(),
    };
    useSession.mockReturnValue(mockSession);
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
});
