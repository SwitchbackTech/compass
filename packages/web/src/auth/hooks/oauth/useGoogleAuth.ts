import { toast } from "react-toastify";
import { useGoogleAuthWithOverlay } from "@web/auth/hooks/oauth/useGoogleAuthWithOverlay";
import { useIsSignupComplete } from "@web/auth/hooks/onboarding/useIsSignupComplete";
import { useSkipOnboarding } from "@web/auth/hooks/onboarding/useSkipOnboarding";
import { useSession } from "@web/auth/hooks/session/useSession";
import {
  authenticate,
  fetchOnboardingStatus,
  syncLocalEvents,
} from "@web/common/utils/auth/google-auth.util";
import { markUserAsAuthenticated } from "@web/common/utils/storage/auth-state.util";
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
import { toastDefaultOptions } from "@web/views/Day/components/Toasts";
import { OnboardingStepProps } from "@web/views/Onboarding";

export function useGoogleAuth(props?: OnboardingStepProps) {
  const dispatch = useAppDispatch();
  const { setAuthenticated, setIsSyncing } = useSession();
  const { markSignupCompleted } = useIsSignupComplete();
  const { updateOnboardingStatus } = useSkipOnboarding();

  const googleLogin = useGoogleAuthWithOverlay({
    isSyncingRetainedOnSuccess: true,
    onStart: () => {
      dispatch(startAuthenticating());
    },
    onSuccess: async (data) => {
      try {
        const authResult = await authenticate(data);
        if (!authResult.success) {
          console.error(authResult.error);
          dispatch(
            authError(authResult.error?.message || "Authentication failed"),
          );
          setIsSyncing(false);
          return;
        }

        // Mark user as authenticated in localStorage
        // This ensures the app always uses RemoteEventRepository going forward
        markUserAsAuthenticated();

        setAuthenticated(true);
        dispatch(authSuccess());

        // Now that OAuth is complete, indicate that calendar import is starting
        dispatch(importGCalSlice.actions.importing(true));

        const { skipOnboarding } = await fetchOnboardingStatus();

        updateOnboardingStatus(skipOnboarding);

        markSignupCompleted();

        props?.onNext?.();

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
        setIsSyncing(false);
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
      // Ensure overlay is dismissed on error
      setIsSyncing(false);
    },
  });

  return googleLogin;
}
