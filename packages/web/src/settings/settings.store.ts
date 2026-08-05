import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";

interface SettingsState {
  isCmdPaletteOpen: boolean;
  isSettingsOpen: boolean;
  isAboutOpen: boolean;
}

export const initialSettingsState: SettingsState = {
  isCmdPaletteOpen: false,
  isSettingsOpen: false,
  isAboutOpen: false,
};

// Selectors passed to this hook must return primitives or stable references;
// a selector that builds a new object/array each call needs `useShallow`.
export const useSettingsStore = create<SettingsState>()(
  devtools(() => initialSettingsState, {
    name: "compass/settings",
    enabled: IS_DEV,
  }),
);

export const settingsActions = {
  closeCmdPalette: () =>
    useSettingsStore.setState({ isCmdPaletteOpen: false }, false, {
      type: "closeCmdPalette",
    }),
  openCmdPalette: () =>
    useSettingsStore.setState({ isCmdPaletteOpen: true }, false, {
      type: "openCmdPalette",
    }),
  toggleCmdPalette: () =>
    useSettingsStore.setState(
      (state) => ({ isCmdPaletteOpen: !state.isCmdPaletteOpen }),
      false,
      { type: "toggleCmdPalette" },
    ),
  closeSettings: () =>
    useSettingsStore.setState({ isSettingsOpen: false }, false, {
      type: "closeSettings",
    }),
  openSettings: () =>
    useSettingsStore.setState({ isSettingsOpen: true }, false, {
      type: "openSettings",
    }),
  toggleSettings: () =>
    useSettingsStore.setState(
      (state) => ({ isSettingsOpen: !state.isSettingsOpen }),
      false,
      { type: "toggleSettings" },
    ),
  closeAbout: () =>
    useSettingsStore.setState({ isAboutOpen: false }, false, {
      type: "closeAbout",
    }),
  openAbout: () =>
    useSettingsStore.setState({ isAboutOpen: true }, false, {
      type: "openAbout",
    }),
};

export const selectIsCmdPaletteOpen = (state: SettingsState) =>
  state.isCmdPaletteOpen;

export const selectIsSettingsOpen = (state: SettingsState) =>
  state.isSettingsOpen;

export const selectIsAboutOpen = (state: SettingsState) => state.isAboutOpen;
