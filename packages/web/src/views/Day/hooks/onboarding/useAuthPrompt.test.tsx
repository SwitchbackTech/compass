import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAuthPrompt } from "./useAuthPrompt";

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

describe("useAuthPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should show auth prompt after user creates 2+ tasks", async () => {
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useAuthPrompt({
          tasks: [{ id: "1" }, { id: "2" }],
          hasNavigatedDates: false,
          showOnboardingOverlay: false,
          showCmdPaletteTutorial: false,
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
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useAuthPrompt({
          tasks: [],
          hasNavigatedDates: true,
          showOnboardingOverlay: false,
          showCmdPaletteTutorial: false,
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

  it("should show auth prompt after user opens cmd palette", async () => {
    const store = createTestStore(true); // cmd palette is open

    const { result } = renderHook(
      () =>
        useAuthPrompt({
          tasks: [],
          hasNavigatedDates: false,
          showOnboardingOverlay: false,
          showCmdPaletteTutorial: false,
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
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useAuthPrompt({
          tasks: [{ id: "1" }, { id: "2" }],
          hasNavigatedDates: false,
          showOnboardingOverlay: false,
          showCmdPaletteTutorial: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showAuthPrompt).toBe(false);
  });

  it("should not show auth prompt for authenticated users", () => {
    const { useSession } = require("@web/common/hooks/useSession");
    useSession.mockReturnValue({ authenticated: true });
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useAuthPrompt({
          tasks: [{ id: "1" }, { id: "2" }],
          hasNavigatedDates: false,
          showOnboardingOverlay: false,
          showCmdPaletteTutorial: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showAuthPrompt).toBe(false);
  });

  it("should not show auth prompt if onboarding overlay is showing", () => {
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useAuthPrompt({
          tasks: [{ id: "1" }, { id: "2" }],
          hasNavigatedDates: false,
          showOnboardingOverlay: true,
          showCmdPaletteTutorial: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showAuthPrompt).toBe(false);
  });

  it("should not show auth prompt if cmd palette tutorial is showing", () => {
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useAuthPrompt({
          tasks: [{ id: "1" }, { id: "2" }],
          hasNavigatedDates: false,
          showOnboardingOverlay: false,
          showCmdPaletteTutorial: true,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showAuthPrompt).toBe(false);
  });

  it("should not show auth prompt if user has less than 2 tasks", () => {
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useAuthPrompt({
          tasks: [{ id: "1" }],
          hasNavigatedDates: false,
          showOnboardingOverlay: false,
          showCmdPaletteTutorial: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    expect(result.current.showAuthPrompt).toBe(false);
  });

  it("should dismiss auth prompt", () => {
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useAuthPrompt({
          tasks: [{ id: "1" }, { id: "2" }],
          hasNavigatedDates: false,
          showOnboardingOverlay: false,
          showCmdPaletteTutorial: false,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    result.current.dismissAuthPrompt();
    expect(result.current.showAuthPrompt).toBe(false);
  });
});
