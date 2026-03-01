import { toast } from "react-toastify";
import { Origin } from "@core/constants/core.constants";
import { AuthApi } from "@web/common/apis/auth.api";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { SignInUpInput } from "@web/components/oauth/ouath.types";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
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
  store.dispatch(
    eventsEntitiesSlice.actions.removeEventsByOrigin({
      origins: [Origin.GOOGLE, Origin.GOOGLE_IMPORT],
    }),
  );
  store.dispatch(
    triggerFetch({ reason: Sync_AsyncStateContextReason.GOOGLE_REVOKED }),
  );
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
