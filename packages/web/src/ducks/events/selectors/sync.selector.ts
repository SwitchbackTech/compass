import { RootState } from "@web/store";
// import { createSelector } from "reselect";

// const selectSync = (state: RootState) => state.sync;

// export const selectIsRefreshNeededWithSelector = createSelector(
//   [selectSync],
//   (sync) => sync.isFetchNeeded
// );
// export const isRefreshNeeded = selectIsRefreshNeeded;

export const selectIsRefetchNeeded = (state: RootState) =>
  state.sync.isFetchNeeded;
