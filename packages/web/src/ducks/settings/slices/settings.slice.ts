import { createSlice } from "@reduxjs/toolkit";

interface State_Settings {
  isCmdPaletteOpen: boolean;
}

const initialState: State_Settings = {
  isCmdPaletteOpen: false,
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    closeCmdPalette: (state) => {
      state.isCmdPaletteOpen = false;
    },
    openCmdPalette: (state) => {
      state.isCmdPaletteOpen = true;
    },
    toggleCmdPalette: (state) => {
      state.isCmdPaletteOpen = !state.isCmdPaletteOpen;
    },
  },
});
