import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { handleGoogleRevoked } from "@web/auth/google/util/google.auth.util";
import { queryClient } from "@web/common/query/query-client";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
import { useAppDispatch } from "@web/store/store.hooks";
import { sseEmitter } from "../client/sse.client";
import { createUseGcalSSE } from "./useGcalSSE.factory";

export const useGcalSSE = createUseGcalSSE({
  handleGoogleRevoked,
  invalidateEventQueries: () =>
    void queryClient.invalidateQueries({ queryKey: eventQueryKeys.all }),
  refreshUserMetadata,
  showErrorToast,
  sseEmitter,
  useAppDispatch,
});
