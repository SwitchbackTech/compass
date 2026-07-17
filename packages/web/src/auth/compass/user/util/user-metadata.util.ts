import { Status } from "@core/errors/status.codes";
import { UserApi } from "@web/api/user.api";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { showGoogleReconnectToast } from "@web/common/utils/toast/google-reconnect.toast";

let refreshUserMetadataRequest: Promise<void> | null = null;
let hasShownReconnectToastThisLoad = false;

export const refreshUserMetadata = async (options?: {
  force?: boolean;
}): Promise<void> => {
  if (refreshUserMetadataRequest) {
    if (!options?.force) {
      return refreshUserMetadataRequest;
    }

    // The in-flight request predates whatever invalidated the metadata (e.g.
    // a Google revocation prune), so its response is stale. Let it settle,
    // then fetch fresh.
    return refreshUserMetadataRequest.then(() => refreshUserMetadata());
  }

  userMetadataActions.setLoading();

  refreshUserMetadataRequest = UserApi.getMetadata()
    .then((metadata) => {
      userMetadataActions.set(metadata);

      // Catches returning users whose Google grant died while they were away:
      // they get the actionable reconnect toast instead of having to discover
      // the palette's "Reconnect Google Calendar" action. At most once per
      // page load, so a dismissal isn't nagged by later refreshes.
      if (
        metadata.google?.connectionState === "RECONNECT_REQUIRED" &&
        !hasShownReconnectToastThisLoad
      ) {
        hasShownReconnectToastThisLoad = true;
        showGoogleReconnectToast();
      }
    })
    .catch((error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      const isUnauthorized =
        status === Status.UNAUTHORIZED || status === Status.FORBIDDEN;

      if (isUnauthorized) {
        userMetadataActions.clear();
        return;
      }

      console.error("Failed to refresh user metadata", error);
      userMetadataActions.finishLoading();
    })
    .finally(() => {
      refreshUserMetadataRequest = null;
    });

  return refreshUserMetadataRequest;
};
