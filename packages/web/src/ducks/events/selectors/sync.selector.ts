import { RootState } from "@web/store";

export const selectIsRefetchNeeded = (state: RootState) =>
  state.sync.isFetchNeeded;
