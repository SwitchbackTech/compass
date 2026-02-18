import { batch } from "react-redux";
import { toast } from "react-toastify";
import { useGoogleAuthWithOverlay } from "@web/auth/hooks/oauth/useGoogleAuthWithOverlay";
import { useSession } from "@web/auth/hooks/session/useSession";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";
import {
  authenticate,
  syncLocalEvents,
} from "@web/common/utils/auth/google-auth.util";
import { markUserAsAuthenticated } from "@web/common/utils/storage/auth-state.util";
import {
  SESSION_EXPIRED_TOAST_ID,
  dismissErrorToast,
} from "@web/common/utils/toast/error-toast.util";
import {
  authError,
  authSuccess,
  startAuthenticating,
} from "@web/ducks/auth/slices/auth.slice";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { useAppDispatch } from "@web/store/store.hooks";

export function useGoogleAuth() {
  const dispatch = useAppDispatch();
  const { setAuthenticated } = useSession();

  const googleLogin = useGoogleAuthWithOverlay({
    onStart: () => {
      dismissErrorToast(SESSION_EXPIRED_TOAST_ID);
      dispatch(startAuthenticating());
      dispatch(importGCalSlice.actions.setAwaitingImportResults(true));
      dispatch(importGCalSlice.actions.clearImportResults(undefined));
    },
    onSuccess: async (data) => {
      try {
        const authResult = await authenticate(data);
        if (!authResult.success) {
          console.error(authResult.error);
          dispatch(
            authError(authResult.error?.message || "Authentication failed"),
          );
          dispatch(importGCalSlice.actions.setAwaitingImportResults(false));
          dispatch(importGCalSlice.actions.importing(false));
          return;
        }

        // Mark user as authenticated in localStorage
        // This ensures the app always uses RemoteEventRepository going forward
        markUserAsAuthenticated();

        setAuthenticated(true);

        // Batch these dispatches to ensure they update in the same render cycle,
        // preventing a flash where isAuthenticating=false but importing=false
        batch(() => {
          dispatch(authSuccess());
          // Now that OAuth is complete, indicate that calendar import is starting
          dispatch(importGCalSlice.actions.importing(true));
          dispatch(importGCalSlice.actions.setAwaitingImportResults(true));
        });

        const syncResult = await syncLocalEvents();

        if (syncResult.success && syncResult.syncedCount > 0) {
          dispatch(
            importGCalSlice.actions.setLocalEventsSynced(
              syncResult.syncedCount,
            ),
          );
        } else if (!syncResult.success) {
          toast.error(
            "We could not sync your local events. Your changes are still saved on this device.",
            toastDefaultOptions,
          );
          console.error(syncResult.error);
        }

        // Trigger a refetch to load events from the cloud
        // This ensures the UI displays events after authentication
        dispatch(triggerFetch());
      } catch (error) {
        // Ensure overlay is dismissed if any error occurs during the auth flow
        // This handles cases where authenticate() or other operations throw unexpected errors
        console.error("Error during authentication flow:", error);
        dispatch(
          authError(
            error instanceof Error ? error.message : "Authentication failed",
          ),
        );
        dispatch(importGCalSlice.actions.setAwaitingImportResults(false));
        dispatch(importGCalSlice.actions.importing(false));
        throw error; // Re-throw so useGoogleLoginWithSyncOverlay can handle it via onError
      }
    },
    onError: (error) => {
      console.error(error);
      dispatch(
        authError(
          error instanceof Error ? error.message : "Authentication failed",
        ),
      );
      dispatch(importGCalSlice.actions.setAwaitingImportResults(false));
      dispatch(importGCalSlice.actions.importing(false));
    },
  });

  return googleLogin;
}
