import { toast } from "react-toastify";
import { markGoogleAsRevoked } from "@web/auth/google/state/google.auth.state";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { closeStream, openStream } from "@web/sse/client/sse.client";
import { store } from "@web/store";
import {
  createGoogleAuthUtil,
  LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
  LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE,
  type SyncLocalEventsResult,
} from "./google.auth.util.factory";

const googleAuthUtil = createGoogleAuthUtil({
  closeStream,
  dispatch: store.dispatch,
  isToastActive: toast.isActive,
  markGoogleAsRevoked,
  openStream,
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
