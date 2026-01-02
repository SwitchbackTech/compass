import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import { markStepCompleted } from "../utils/onboardingStorage.util";
import { useStep5Detection } from "./useStep5Detection";

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

describe("useStep5Detection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should detect when cmd palette is opened", async () => {
    const onStepComplete = jest.fn();
    const store = createTestStore(true); // cmd palette is open

    renderHook(
      () =>
        useStep5Detection({
          currentStep: ONBOARDING_STEPS.CMD_PALETTE_INFO,
          onStepComplete,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    await waitFor(() => {
      expect(onStepComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("should not trigger when not on step 5", async () => {
    const onStepComplete = jest.fn();
    const store = createTestStore(true); // cmd palette is open

    renderHook(
      () =>
        useStep5Detection({
          currentStep: ONBOARDING_STEPS.EDIT_DESCRIPTION,
          onStepComplete,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    await waitFor(
      () => {
        expect(onStepComplete).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );
  });

  it("should not trigger when step is already completed", async () => {
    const onStepComplete = jest.fn();
    markStepCompleted(ONBOARDING_STEPS.CMD_PALETTE_INFO);
    const store = createTestStore(true); // cmd palette is open

    renderHook(
      () =>
        useStep5Detection({
          currentStep: ONBOARDING_STEPS.CMD_PALETTE_INFO,
          onStepComplete,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    await waitFor(
      () => {
        expect(onStepComplete).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );
  });

  it("should handle null currentStep", async () => {
    const onStepComplete = jest.fn();
    const store = createTestStore(true); // cmd palette is open

    renderHook(
      () =>
        useStep5Detection({
          currentStep: null,
          onStepComplete,
        }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    await waitFor(
      () => {
        expect(onStepComplete).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );
  });
});
