import { RootState } from "@web/store";

export const selectIsCmdPaletteOpen = (state: RootState) =>
  state.settings.isCmdPaletteOpen;

export const selectIsRightSidebarOpen = (state: RootState) =>
  state.settings.isRightSidebarOpen;
