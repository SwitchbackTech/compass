import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useIsSignupComplete } from "@web/auth/hooks/useIsSignupComplete";
import { useSession } from "@web/auth/hooks/useSession";
import { useSkipOnboarding } from "@web/auth/hooks/useSkipOnboarding";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useGoogleLoginWithSyncOverlay } from "@web/common/hooks/useGoogleLoginWithSyncOverlay";
import {
  authenticate,
  fetchOnboardingStatus,
  syncLocalEvents,
} from "@web/common/utils/auth/google-auth.util";
import { markUserAsAuthenticated } from "@web/common/utils/storage/auth-state.util";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { toastDefaultOptions } from "@web/views/Day/components/Toasts";
import { OnboardingStepProps } from "@web/views/Onboarding";

// interface UseGoogleAuthOptions extends Partial<OnboardingStepProps> {
//   redirectTo?: string | null;
// }

export function useGoogleAuth(props?: OnboardingStepProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { setAuthenticated, setIsSyncing } = useSession();
  const { markSignupCompleted } = useIsSignupComplete();
  const { updateOnboardingStatus } = useSkipOnboarding();

  const googleLogin = useGoogleLoginWithSyncOverlay({
    isSyncingRetainedOnSuccess: true,
    onSuccess: async (data) => {
      const authResult = await authenticate(data);
      if (!authResult.success) {
        console.error(authResult.error);
        setIsSyncing(false);
        return;
      }

      // Mark user as authenticated in localStorage
      // This ensures the app always uses RemoteEventRepository going forward
      markUserAsAuthenticated();

      setAuthenticated(true);

      // Now that OAuth is complete, indicate that calendar import is starting
      dispatch(importGCalSlice.actions.importing(true));

      const { skipOnboarding } = await fetchOnboardingStatus();

      updateOnboardingStatus(skipOnboarding);

      markSignupCompleted();

      props?.onNext?.();

      const syncResult = await syncLocalEvents();

      if (syncResult.success && syncResult.syncedCount > 0) {
        dispatch(
          importGCalSlice.actions.setLocalEventsSynced(syncResult.syncedCount),
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

      // Note: setIsSyncing(false) is handled by SocketProvider when IMPORT_GCAL_END is received

      // if (options?.redirectTo === null) {
      //   return;
      // }

      // if (options?.redirectTo) {
      //   navigate(options.redirectTo);
      //   return;
      // }

      navigate(skipOnboarding ? ROOT_ROUTES.ROOT : ROOT_ROUTES.ONBOARDING);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return googleLogin;
}
