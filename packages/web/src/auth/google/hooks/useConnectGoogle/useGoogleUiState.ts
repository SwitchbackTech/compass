import { useSyncExternalStore } from "react";
import { type GoogleConnectionState } from "@core/types/user.types";
import { hasUserEverAuthenticated } from "@web/auth/compass/state/auth.state.util";
import {
  getGoogleSyncIndicatorOverride,
  subscribeToGoogleSyncUIState,
} from "@web/auth/google/state/google.sync.state";
import {
  selectGoogleConnectionState,
  selectUserMetadataStatus,
  type UserMetadataStatus,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { type GoogleUiState } from "./useConnectGoogle.types";

type SyncIndicator = ReturnType<typeof getGoogleSyncIndicatorOverride>;

export function resolveGoogleUiState({
  connectionState,
  hasAuthenticated,
  syncIndicator,
  userMetadataStatus,
}: {
  connectionState: GoogleConnectionState;
  hasAuthenticated: boolean;
  syncIndicator: SyncIndicator;
  userMetadataStatus: UserMetadataStatus;
}): GoogleUiState {
  if (syncIndicator === "syncing") return "IMPORTING";

  if (hasAuthenticated && userMetadataStatus !== "loaded") {
    return "checking";
  }

  return connectionState;
}

// Merges server metadata with transient import overrides. The external
// store subscription keeps every sync indicator aligned as SSE updates arrive.
export function useGoogleUiState(): GoogleUiState {
  const connectionState = useUserMetadataStore(selectGoogleConnectionState);
  const userMetadataStatus = useUserMetadataStore(selectUserMetadataStatus);
  const syncIndicator = useSyncExternalStore(
    subscribeToGoogleSyncUIState,
    getGoogleSyncIndicatorOverride,
    getGoogleSyncIndicatorOverride,
  );

  // Returning users should not briefly look disconnected while their server
  // metadata is still loading.
  return resolveGoogleUiState({
    connectionState,
    hasAuthenticated: hasUserEverAuthenticated(),
    syncIndicator,
    userMetadataStatus,
  });
}
