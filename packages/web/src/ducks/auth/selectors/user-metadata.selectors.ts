import { type RootState } from "@web/store";

export const selectUserMetadata = (state: RootState) =>
  state.userMetadata.current;

export const selectGoogleMetadata = (state: RootState) =>
  selectUserMetadata(state)?.google;
