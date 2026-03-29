import { toast } from "react-toastify";
import { Origin } from "@core/constants/core.constants";
import { type Result_Auth_Compass } from "@core/types/auth.types";
import { markGoogleAsRevoked } from "@web/auth/google/google.auth.state";
import { AuthApi } from "@web/common/apis/auth.api";
import {
  GOOGLE_REVOKED_TOAST_ID,
  toastDefaultOptions,
} from "@web/common/constants/toast.constants";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { type SignInUpInput } from "@web/components/oauth/ouath.types";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { reconnect } from "@web/socket/client/socket.client";
import { type AppDispatch, store } from "@web/store";

export interface AuthenticateResult {
  success: boolean;
  data?: Result_Auth_Compass;
  error?: Error;
}

export interface SyncLocalEventsResult {
  syncedCount: number;
  success: boolean;
  error?: Error;
}

export const LOCAL_EVENTS_SYNC_ERROR_MESSAGE =
  "We could not sync your local events. Your changes are still saved on this device.";

/**
 * Authenticate with Google using the provided credentials.
 */
export async function authenticate(
  data: SignInUpInput,
): Promise<AuthenticateResult> {
  try {
    const response = await AuthApi.loginOrSignup(data);
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

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

  // Always reconnect so the socket gets a fresh session; the backend has pruned
  // Google data and the current connection may carry stale auth state.
  reconnect();
};

export const showLocalEventsSyncFailure = (error: Error | undefined) => {
  toast.error(LOCAL_EVENTS_SYNC_ERROR_MESSAGE, toastDefaultOptions);
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
 * Runs {@link syncLocalEvents}, surfaces failures with a toast, and records
 * synced counts in Redux when migration succeeds. Returns whether sync succeeded.
 */
export async function syncPendingLocalEvents(
  dispatch: AppDispatch,
): Promise<boolean> {
  const syncResult = await syncLocalEvents();

  if (!syncResult.success) {
    showLocalEventsSyncFailure(syncResult.error);
    return false;
  }

  if (syncResult.syncedCount > 0) {
    dispatch(
      importGCalSlice.actions.setLocalEventsSynced(syncResult.syncedCount),
    );
  }

  return true;
}
