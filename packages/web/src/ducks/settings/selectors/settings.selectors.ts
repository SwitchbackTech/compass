import { RootState } from "@web/store";

export const selectDatesInView = (state: RootState) => state.settings.dates;

export const selectIsRightSidebarOpen = (state: RootState) =>
  state.settings.isRightSidebarOpen;
