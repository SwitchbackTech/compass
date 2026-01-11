import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useIsSignupComplete } from "@web/auth/isSignupComplete";
import { useSkipOnboarding } from "@web/auth/useSkipOnboarding";
import { AuthApi } from "@web/common/apis/auth.api";
import { UserApi } from "@web/common/apis/user.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useSession } from "@web/common/hooks/useSession";
import { markUserAsAuthenticated } from "@web/common/utils/storage/auth-state.util";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { toastDefaultOptions } from "@web/views/Day/components/Toasts";
import { OnboardingStepProps } from "@web/views/Onboarding";

export function useGoogleAuth(props?: Partial<OnboardingStepProps>) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { setAuthenticated, setIsSyncing } = useSession();
  const { markSignupCompleted } = useIsSignupComplete();
  const { updateOnboardingStatus } = useSkipOnboarding();

  const googleLogin = useGoogleLogin({
    onSuccess: async (data) => {
      await AuthApi.loginOrSignup(data);

      // Mark user as authenticated in localStorage
      // This ensures the app always uses RemoteEventRepository going forward
      markUserAsAuthenticated();

      setAuthenticated(true);
      setIsSyncing(true);

      const metadata = await UserApi.getMetadata().catch(() => ({
        skipOnboarding: true,
      }));

      const skipOnboarding = metadata.skipOnboarding ?? true;

      updateOnboardingStatus(skipOnboarding);

      markSignupCompleted();

      props?.onNext?.();

      try {
        const syncedCount = await syncLocalEventsToCloud();

        if (syncedCount > 0) {
          toast(
            `${syncedCount} local event(s) synced to the cloud.`,
            toastDefaultOptions,
          );
        }

        // Trigger a refetch to load events from the cloud
        // This ensures the UI displays events after authentication
        dispatch(triggerFetch());
      } catch (error) {
        toast.error(
          "We could not sync your local events. Your changes are still saved on this device.",
          toastDefaultOptions,
        );
        console.error(error);

        // Still trigger refetch to show cloud events (even if local sync failed)
        dispatch(triggerFetch());
      }
      // Note: setIsSyncing(false) is handled by SocketProvider when IMPORT_GCAL_END is received

      navigate(skipOnboarding ? ROOT_ROUTES.ROOT : ROOT_ROUTES.ONBOARDING);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return googleLogin;
}
