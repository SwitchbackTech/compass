import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { handleGoogleRevoked } from "@web/auth/google/util/google.auth.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { useAppDispatch } from "@web/store/store.hooks";
import { sseEmitter } from "../client/sse.client";
import { createUseGcalSSE } from "./useGcalSSE.factory";

export const useGcalSSE = createUseGcalSSE({
  handleGoogleRevoked,
  refreshUserMetadata,
  showErrorToast,
  sseEmitter,
  useAppDispatch,
});
