import { toast } from "react-toastify";
import { markGoogleAsRevoked } from "@web/auth/google/state/google.auth.state";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { queryClient } from "@web/common/query/query-client";
import { refreshEventRepositorySource } from "@web/common/repositories/event/event.repository.source.store";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { removeEventsByOriginFromQueries } from "@web/events/queries/event.query.cache";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { closeStream, openStream } from "@web/sse/client/sse.client";
import {
  createGoogleAuthUtil,
  LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
  LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE,
  type SyncLocalEventsResult,
} from "./google.auth.util.factory";

const googleAuthUtil = createGoogleAuthUtil({
  clearUserMetadata: userMetadataActions.clear,
  closeStream,
  isToastActive: toast.isActive,
  markGoogleAsRevoked,
  openStream,
  refreshEventRepositorySource,
  removeEventsByOrigin: (origins) =>
    removeEventsByOriginFromQueries(queryClient, origins),
  removeEventQueries: () =>
    queryClient.removeQueries({
      queryKey: eventQueryKeys.all,
      predicate: ({ queryKey }) => {
        const metadata = queryKey[2];
        return (
          typeof metadata === "object" &&
          metadata !== null &&
          "source" in metadata &&
          metadata.source === "remote"
        );
      },
    }),
  syncLocalEventsToCloud: () => syncLocalEventsToCloud(),
  toastError: toast.error,
});

const {
  handleGoogleRevoked,
  showLocalEventsSyncFailure,
  syncLocalEvents,
  syncPendingLocalEvents,
} = googleAuthUtil;

export {
  handleGoogleRevoked,
  LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
  LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE,
  type SyncLocalEventsResult,
  showLocalEventsSyncFailure,
  syncLocalEvents,
  syncPendingLocalEvents,
};
