import { toast } from "react-toastify";
import { Origin } from "@core/constants/core.constants";
import { FETCH_USER_METADATA } from "@core/constants/websocket.constants";
import { markGoogleAsRevoked } from "@web/auth/google/google.auth.state";
import { AuthApi } from "@web/common/apis/auth.api";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { type SignInUpInput } from "@web/components/oauth/ouath.types";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { socket } from "@web/socket/client/socket.client";
import { store } from "@web/store";

export interface AuthenticateResult {
  success: boolean;
  error?: Error;
}

export interface SyncLocalEventsResult {
  syncedCount: number;
  success: boolean;
  error?: Error;
}

/**
 * Authenticate with Google using the provided credentials.
 */
export async function authenticate(
  data: SignInUpInput,
): Promise<AuthenticateResult> {
  try {
    await AuthApi.loginOrSignup(data);
    return { success: true };
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
  store.dispatch(
    authSlice.actions.setGoogleStatus({
      connectionStatus: "reconnect_required",
      syncStatus: "none",
    }),
  );
  store.dispatch(importGCalSlice.actions.importing(false));
  store.dispatch(importGCalSlice.actions.setIsImportPending(false));

  store.dispatch(
    eventsEntitiesSlice.actions.removeEventsByOrigin({
      origins: [Origin.GOOGLE, Origin.GOOGLE_IMPORT],
    }),
  );
  store.dispatch(
    triggerFetch({ reason: Sync_AsyncStateContextReason.GOOGLE_REVOKED }),
  );
  socket.emit(FETCH_USER_METADATA);
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
