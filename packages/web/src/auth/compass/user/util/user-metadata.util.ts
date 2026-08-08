import { Status } from "@core/errors/status.codes";
import { type UserMetadata } from "@core/types/user.types";
import { UserApi } from "@web/api/user.api";
import {
  hasGoogleReconnectRequired,
  syncReconnectRequiredFromConnections,
} from "@web/auth/google/state/google.reconnect.state";
import {
  findPrimaryGoogleSyncConnectionFromMetadata,
  userMetadataActions,
} from "@web/auth/state/user-metadata.store";
import { showGoogleDelayedToast } from "@web/common/utils/toast/google-delayed.toast";
import {
  dismissGoogleReconnectToast,
  showGoogleReconnectToast,
} from "@web/common/utils/toast/google-reconnect.toast";

let refreshUserMetadataRequest: Promise<void> | null = null;
let hasShownReconnectToastThisLoad = false;
let hasShownDelayedToastThisLoad = false;

/**
 * Keep session reconnect overrides and sticky toasts congruent with the latest
 * metadata payload, whether it arrived from REST refresh or SSE.
 */
export const applyUserMetadataSideEffects = (metadata: UserMetadata): void => {
  const connections = metadata.google?.connections ?? [];
  syncReconnectRequiredFromConnections(connections);

  const needsReconnect =
    metadata.google?.connectionState === "RECONNECT_REQUIRED" ||
    hasGoogleReconnectRequired();

  if (needsReconnect) {
    const broken =
      connections.find(
        (connection) => connection.connectionState === "RECONNECT_REQUIRED",
      ) ?? findPrimaryGoogleSyncConnectionFromMetadata(metadata);

    if (!hasShownReconnectToastThisLoad) {
      hasShownReconnectToastThisLoad = true;
      showGoogleReconnectToast({
        connectionId: broken?.id,
        accountEmail: broken?.accountEmail,
      });
    }
  } else {
    dismissGoogleReconnectToast();
    hasShownReconnectToastThisLoad = false;
  }

  if (
    metadata.google?.connectionState === "ATTENTION" &&
    !hasShownDelayedToastThisLoad
  ) {
    hasShownDelayedToastThisLoad = true;
    showGoogleDelayedToast();
  }
};

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
      applyUserMetadataSideEffects(metadata);
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
