import { useSession } from "@web/auth/compass/session/useSession";
import {
  clearAnonymousCalendarChangeSignUpPrompt,
  markUserAsAuthenticated,
} from "@web/auth/compass/state/auth.state.util";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { syncPendingLocalEvents } from "@web/auth/google/util/google.auth.util";
import { queryClient } from "@web/common/query/query-client";
import { refreshEventRepositorySource } from "@web/common/repositories/event/event.repository.source.store";
import { authSuccess } from "@web/ducks/auth/slices/auth.slice";
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
import { useAppDispatch } from "@web/store/store.hooks";
import { createUseCompleteAuthentication } from "./useCompleteAuthentication.factory";

export const useCompleteAuthentication = createUseCompleteAuthentication({
  authSuccess,
  clearAnonymousCalendarChangeSignUpPrompt,
  markUserAsAuthenticated,
  // Local events just synced to the cloud; flip the source to "remote" and drop
  // the local cache entries so the next fetch reads from the backend.
  onEventSourceChanged: () => {
    refreshEventRepositorySource(true);
    queryClient.removeQueries({ queryKey: eventQueryKeys.all });
  },
  refreshUserMetadata,
  syncPendingLocalEvents,
  useAppDispatch,
  useSession,
});
