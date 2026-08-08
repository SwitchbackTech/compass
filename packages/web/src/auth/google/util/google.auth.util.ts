import { type Calendar } from "@core/types/calendar.contracts";
import { queryClient } from "@web/api/query-client";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import {
  type GoogleReconnectTarget,
  markAccountReconnectRequired,
} from "@web/auth/google/state/google.reconnect.state";
import {
  findPrimaryGoogleSyncConnectionFromMetadata,
  selectGoogleSyncConnections,
  userMetadataActions,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { showGoogleReconnectToast } from "@web/common/utils/toast/google-reconnect.toast";
import { getToast } from "@web/common/utils/toast/toast.port";
import { closeStream, openStream } from "@web/sse/client/sse.client";
import {
  createGoogleAuthUtil,
  type GoogleRevokedContext,
} from "./google.auth.util.factory";

const resolveRevokedAccount = (
  context?: GoogleRevokedContext,
): GoogleReconnectTarget => {
  if (context?.connectionId || context?.accountEmail) {
    return {
      connectionId: context.connectionId,
      accountEmail: context.accountEmail,
    };
  }

  const metadata = useUserMetadataStore.getState().current;
  const connections = selectGoogleSyncConnections(
    useUserMetadataStore.getState(),
  );

  if (context?.calendarId) {
    const calendars =
      queryClient.getQueryData<Calendar[]>(calendarQueryKeys.all) ?? [];
    const calendar = calendars.find((entry) => entry.id === context.calendarId);
    if (calendar?.accountEmail) {
      const connection = connections.find(
        (entry) => entry.accountEmail === calendar.accountEmail,
      );
      return {
        connectionId: connection?.id ?? null,
        accountEmail: calendar.accountEmail,
      };
    }
  }

  const alreadyBroken = connections.find(
    (connection) => connection.connectionState === "RECONNECT_REQUIRED",
  );
  if (alreadyBroken) {
    return {
      connectionId: alreadyBroken.id,
      accountEmail: alreadyBroken.accountEmail,
    };
  }

  if (connections.length === 1) {
    return {
      connectionId: connections[0]?.id ?? null,
      accountEmail: connections[0]?.accountEmail ?? null,
    };
  }

  const primary = metadata
    ? findPrimaryGoogleSyncConnectionFromMetadata(metadata)
    : null;
  return {
    connectionId: primary?.id ?? null,
    accountEmail: primary?.accountEmail ?? null,
  };
};

const googleAuthUtil = createGoogleAuthUtil({
  closeStream,
  openStream,
  // Wipe first (a concurrent in-flight metadata request may predate Sync
  // flipping to actionRequired), then force a fresh fetch.
  refreshUserMetadata: () => {
    userMetadataActions.clear();
    void refreshUserMetadata({ force: true });
  },
  resolveRevokedAccount,
  markAccountReconnectRequired,
  showReconnectToast: showGoogleReconnectToast,
  syncLocalEventsToCloud: () => syncLocalEventsToCloud(),
  toastError: (content, options) => getToast().error(content, options),
});

const {
  handleGoogleRevoked,
  showLocalEventsSyncFailure,
  syncLocalEvents,
  syncPendingLocalEvents,
} = googleAuthUtil;

export type { GoogleRevokedContext };
export {
  handleGoogleRevoked,
  showLocalEventsSyncFailure,
  syncLocalEvents,
  syncPendingLocalEvents,
};
