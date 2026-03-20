import { type GoogleConnectionState } from "@core/types/user.types";
import { type RootState } from "@web/store";

export const selectUserMetadata = (state: RootState) =>
  state.userMetadata.current;

export const selectUserMetadataStatus = (state: RootState) =>
  state.userMetadata.status;

export const selectGoogleMetadata = (state: RootState) =>
  selectUserMetadata(state)?.google;

/**
 * Selects the unified Google connection state computed by the server.
 * Returns "NOT_CONNECTED" if metadata hasn't loaded yet.
 */
export const selectGoogleConnectionState = (
  state: RootState,
): GoogleConnectionState =>
  state.userMetadata.current?.google?.connectionState ?? "NOT_CONNECTED";

/**
 * Convenience selector to check if Google Calendar sync is in progress.
 * Derives from the server-computed connectionState.
 */
export const selectIsGoogleSyncing = (state: RootState): boolean =>
  selectGoogleConnectionState(state) === "IMPORTING";
