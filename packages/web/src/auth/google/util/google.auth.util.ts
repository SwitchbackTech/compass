import { toast } from "react-toastify";
import { Origin } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import { markGoogleAsRevoked } from "@web/auth/google/state/google.auth.state";
import { type ApiError } from "@web/common/apis/api.types";
import {
  GOOGLE_REVOKED_TOAST_ID,
  toastDefaultOptions,
} from "@web/common/constants/toast.constants";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { closeStream, openStream } from "@web/sse/client/sse.client";
import { store } from "@web/store";

export interface SyncLocalEventsResult {
  syncedCount: number;
  success: boolean;
  error?: Error;
}

export const LOCAL_EVENTS_SYNC_ERROR_MESSAGE =
  "We could not sync your local events. Your changes are still saved on this device.";
export const LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE =
  "Your session expired before Compass could save your local events. Sign in again to continue. Your changes are still saved on this device.";

const getApiErrorStatus = (error: Error | undefined): number | undefined =>
  (error as ApiError | undefined)?.response?.status;

/** Idempotent handler for Google access revocation. Safe to call from both API interceptor and socket handler. */
export const handleGoogleRevoked = () => {
  if (!toast.isActive(GOOGLE_REVOKED_TOAST_ID)) {
    toast.error("Google access revoked. Your Google data has been removed.", {
      toastId: GOOGLE_REVOKED_TOAST_ID,
      autoClose: false,
    });
  }

  // Mark Google as revoked so the app uses LocalEventRepository
  // until user re-authenticates
  markGoogleAsRevoked();

  store.dispatch(authSlice.actions.resetAuth());
  store.dispatch(userMetadataSlice.actions.clear(undefined));

  store.dispatch(
    eventsEntitiesSlice.actions.removeEventsByOrigin({
      origins: [Origin.GOOGLE, Origin.GOOGLE_IMPORT],
    }),
  );
  store.dispatch(
    triggerFetch({ reason: Sync_AsyncStateContextReason.GOOGLE_REVOKED }),
  );

  // Always reconnect so the stream gets a fresh session; the backend has pruned
  // Google data and the current connection may carry stale auth state.
  closeStream();
  openStream();
};

export const showLocalEventsSyncFailure = (error: Error | undefined) => {
  const status = getApiErrorStatus(error);
  const message =
    status === Status.UNAUTHORIZED
      ? LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE
      : LOCAL_EVENTS_SYNC_ERROR_MESSAGE;

  toast.error(message, toastDefaultOptions);
  console.error(error);
};

/**
 * Sync local events to the cloud.
 */
export async function syncLocalEvents(): Promise<SyncLocalEventsResult> {
  try {
    const syncedCount = await syncLocalEventsToCloud();
    return { syncedCount, success: true };
  } catch (error) {
    return { syncedCount: 0, success: false, error: error as Error };
  }
}

/**
 * Runs {@link syncLocalEvents}, surfaces failures with a toast, and returns
 * whether sync succeeded.
 */
export async function syncPendingLocalEvents(): Promise<boolean> {
  const syncResult = await syncLocalEvents();

  if (!syncResult.success) {
    showLocalEventsSyncFailure(syncResult.error);
    return false;
  }

  return true;
}
