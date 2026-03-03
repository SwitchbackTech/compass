import { type RootState } from "@web/store";

export const selectIsCmdPaletteOpen = (state: RootState) =>
  state.settings.isCmdPaletteOpen;
