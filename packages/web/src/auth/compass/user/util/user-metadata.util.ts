import { Status } from "@core/errors/status.codes";
import { type UserMetadata } from "@core/types/user.types";
import { UserApi } from "@web/api/user.api";
import {
  getGoogleReconnectRequiredAccountEmails,
  hasGoogleReconnectRequired,
  syncReconnectRequiredFromConnections,
} from "@web/auth/google/state/google.reconnect.state";
import {
  findPrimaryGoogleSyncConnectionFromMetadata,
  userMetadataActions,
} from "@web/auth/state/user-metadata.store";
import {
  dismissGoogleDelayedToast,
  showGoogleDelayedToast,
} from "@web/common/utils/toast/google-delayed.toast";
import {
  clearGoogleReconnectToastGate,
  dismissGoogleReconnectToast,
  hasShownGoogleReconnectToastThisLoad,
  showGoogleReconnectToast,
} from "@web/common/utils/toast/google-reconnect.toast";

let refreshUserMetadataRequest: Promise<void> | null = null;
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
    const stickyEmails = getGoogleReconnectRequiredAccountEmails();
    const broken =
      connections.find(
        (connection) => connection.connectionState === "RECONNECT_REQUIRED",
      ) ??
      connections.find((connection) => {
        const email = connection.accountEmail?.toLowerCase();
        return Boolean(email && stickyEmails.has(email));
      }) ??
      // Only fall back to primary when Sync itself says reconnect is required —
      // never invent a target from sticky alone pointing at a healthy primary.
      (metadata.google?.connectionState === "RECONNECT_REQUIRED"
        ? findPrimaryGoogleSyncConnectionFromMetadata(metadata)
        : null);

    if (!hasShownGoogleReconnectToastThisLoad()) {
      showGoogleReconnectToast({
        connectionId: broken?.id,
        accountEmail: broken?.accountEmail,
      });
    }
  } else {
    dismissGoogleReconnectToast();
    clearGoogleReconnectToastGate();
  }

  if (metadata.google?.connectionState === "ATTENTION") {
    if (!hasShownDelayedToastThisLoad) {
      hasShownDelayedToastThisLoad = true;
      showGoogleDelayedToast();
    }
  } else if (hasShownDelayedToastThisLoad) {
    // Recovered: a CRITICAL toast (autoClose: false) never closes on its
    // own, so leaving it up would contradict its own "delayed" copy once
    // the connection is healthy again.
    hasShownDelayedToastThisLoad = false;
    dismissGoogleDelayedToast();
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
