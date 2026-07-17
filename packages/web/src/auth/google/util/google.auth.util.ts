import { toast } from "react-toastify";
import { type Calendar } from "@core/types/calendar.contracts";
import { queryClient } from "@web/api/query-client";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { markGoogleAsRevoked } from "@web/auth/google/state/google.auth.state";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { showGoogleReconnectToast } from "@web/common/utils/toast/google-reconnect.toast";
import { removeEventsByCalendarFromQueries } from "@web/events/queries/event.query.cache";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { refreshEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { closeStream, openStream } from "@web/sse/client/sse.client";
import {
  createGoogleAuthUtil,
  LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
  LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE,
  type SyncLocalEventsResult,
} from "./google.auth.util.factory";

const googleCalendarIds = (): Set<string> => {
  const calendars =
    queryClient.getQueryData<Calendar[]>(calendarQueryKeys.all) ?? [];
  return new Set(
    calendars
      .filter((calendar) => calendar.provider === "google")
      .map((calendar) => calendar.id),
  );
};

const googleAuthUtil = createGoogleAuthUtil({
  closeStream,
  markGoogleAsRevoked,
  openStream,
  refreshEventRepositorySource,
  // Wipe first (a concurrent in-flight metadata request predates the server's
  // prune, so its response is stale), then force a fresh fetch so the UI lands
  // in RECONNECT_REQUIRED instead of a stale connected state.
  refreshUserMetadata: () => {
    userMetadataActions.clear();
    void refreshUserMetadata({ force: true });
  },
  removeEventsByGoogleCalendars: () =>
    removeEventsByCalendarFromQueries(queryClient, googleCalendarIds()),
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
  showReconnectToast: () => void showGoogleReconnectToast(),
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
