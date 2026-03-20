import { Status } from "@core/errors/status.codes";
import { UserApi } from "@web/common/apis/user.api";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { store } from "@web/store";

let refreshUserMetadataRequest: Promise<void> | null = null;

/**
 * Refreshes user metadata from the server.
 *
 * Note: The server-computed connectionState in metadata.google.connectionState
 * will indicate IMPORTING when a sync is in progress. The client reads this
 * via selectGoogleConnectionState/selectIsGoogleSyncing selectors.
 */
export const refreshUserMetadata = async (): Promise<void> => {
  if (refreshUserMetadataRequest) {
    return refreshUserMetadataRequest;
  }

  store.dispatch(userMetadataSlice.actions.setLoading(undefined));

  refreshUserMetadataRequest = UserApi.getMetadata()
    .then((metadata) => {
      // Metadata includes connectionState computed by the server
      store.dispatch(userMetadataSlice.actions.set(metadata));
    })
    .catch((error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      const isUnauthorized =
        status === Status.UNAUTHORIZED || status === Status.FORBIDDEN;

      if (isUnauthorized) {
        store.dispatch(userMetadataSlice.actions.clear(undefined));
        return;
      }

      console.error("Failed to refresh user metadata", error);
      store.dispatch(userMetadataSlice.actions.finishLoading(undefined));
    })
    .finally(() => {
      refreshUserMetadataRequest = null;
    });

  return refreshUserMetadataRequest;
};
