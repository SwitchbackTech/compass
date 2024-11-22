import { RootState } from "@web/store";

export const selectIsCmdPaletteOpen = (state: RootState) =>
  state.settings.isCmdPaletteOpen;
