import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { handleGoogleRevoked } from "@web/auth/google/util/google.auth.util";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { queryClient } from "@web/common/query/query-client";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { invalidateEventQueriesUnlessMutating } from "@web/events/queries/event.query.invalidation";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { sseEmitter } from "../client/sse.client";
import { createUseGcalSSE } from "./useGcalSSE.factory";

export const useGcalSSE = createUseGcalSSE({
  handleGoogleRevoked,
  invalidateEventQueries: () =>
    invalidateEventQueriesUnlessMutating(queryClient, eventQueryKeys.all),
  refreshUserMetadata,
  setUserMetadata: userMetadataActions.set,
  showErrorToast,
  sseEmitter,
});
