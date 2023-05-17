import { RootState } from "@web/store";

export const selectIsRightSidebarOpen = (state: RootState) =>
  state.settings.isRightSidebarOpen;
