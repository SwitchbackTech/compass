import { RootState } from "@web/store";

export const selectDatesInView = (state: RootState) => state.view.dates;
export const selectIsSidebarOpen = (state: RootState) =>
  state.view.sidebar.isOpen;
export const selectSidebar = (state: RootState) => state.view.sidebar;
