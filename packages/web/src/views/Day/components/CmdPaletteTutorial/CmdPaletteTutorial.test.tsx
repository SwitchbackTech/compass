import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { CmdPaletteTutorial } from "./CmdPaletteTutorial";

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

describe("CmdPaletteTutorial", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render tutorial content", () => {
    const store = createTestStore();
    const onDismiss = jest.fn();

    render(
      <Provider store={store}>
        <CmdPaletteTutorial onDismiss={onDismiss} />
      </Provider>,
    );

    expect(screen.getByText("Try the Command Palette")).toBeInTheDocument();
    expect(
      screen.getByText(/Press.*to open the command palette/i),
    ).toBeInTheDocument();
  });

  it("should dismiss when 'Got it' button is clicked", async () => {
    const store = createTestStore();
    const onDismiss = jest.fn();

    render(
      <Provider store={store}>
        <CmdPaletteTutorial onDismiss={onDismiss} />
      </Provider>,
    );

    const gotItButton = screen.getByRole("button", { name: /got it/i });
    await userEvent.click(gotItButton);

    expect(onDismiss).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN)).toBe(
      "true",
    );
  });

  it("should open cmd palette and dismiss when 'Open it now' button is clicked", async () => {
    const store = createTestStore();
    const onDismiss = jest.fn();

    render(
      <Provider store={store}>
        <CmdPaletteTutorial onDismiss={onDismiss} />
      </Provider>,
    );

    const openButton = screen.getByRole("button", { name: /open it now/i });
    await userEvent.click(openButton);

    await waitFor(() => {
      expect(store.getState().settings.isCmdPaletteOpen).toBe(true);
    });

    expect(onDismiss).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN)).toBe(
      "true",
    );
  });

  it("should dismiss when cmd+k is pressed", async () => {
    const store = createTestStore();
    const onDismiss = jest.fn();

    render(
      <Provider store={store}>
        <CmdPaletteTutorial onDismiss={onDismiss} />
      </Provider>,
    );

    // Simulate cmd+k (Meta+k on Mac, Ctrl+k on Windows)
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

    // Create event with proper modifier key properties
    const eventProps = isMac
      ? { metaKey: true, ctrlKey: false }
      : { metaKey: false, ctrlKey: true };

    const keyEvent = new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      bubbles: true,
      cancelable: true,
      ...eventProps,
    });

    // Dispatch to window (component listens on window)
    window.dispatchEvent(keyEvent);

    await waitFor(
      () => {
        expect(onDismiss).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    expect(localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN)).toBe(
      "true",
    );
  });
});
