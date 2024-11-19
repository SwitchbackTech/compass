import { RootState } from "@web/store";

export const selectDatesInView = (state: RootState) => state.view.dates;
export const selectIsSidebarOpen = (state: RootState) =>
  state.view.sidebar.isOpen;
export const selectSidebarTab = (state: RootState) => state.view.sidebar.tab;
