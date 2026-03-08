import { type RootState } from "@web/store";

export const selectUserMetadata = (state: RootState) =>
  state.userMetadata.current;

export const selectUserMetadataStatus = (state: RootState) =>
  state.userMetadata.status;

export const selectGoogleMetadata = (state: RootState) =>
  selectUserMetadata(state)?.google;
