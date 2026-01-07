import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useIsSignupComplete } from "@web/auth/isSignupComplete";
import { useSkipOnboarding } from "@web/auth/useSkipOnboarding";
import { AuthApi } from "@web/common/apis/auth.api";
import { UserApi } from "@web/common/apis/user.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useSession } from "@web/common/hooks/useSession";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { toastDefaultOptions } from "@web/views/Day/components/Toasts";
import { OnboardingStepProps } from "@web/views/Onboarding";

export function useGoogleAuth(props?: Partial<OnboardingStepProps>) {
  const navigate = useNavigate();
  const { setAuthenticated, setIsSyncing } = useSession();
  const { markSignupCompleted } = useIsSignupComplete();
  const { updateOnboardingStatus } = useSkipOnboarding();

  const googleLogin = useGoogleLogin({
    onSuccess: async (data) => {
      await AuthApi.loginOrSignup(data);

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
        await syncLocalEventsToCloud();
        toast(
          "Your events are now synced and stored in the cloud.",
          toastDefaultOptions,
        );
      } catch (error) {
        toast.error(
          "We could not sync your local events. Your changes are still saved on this device.",
          toastDefaultOptions,
        );
        console.error(error);
      } finally {
        setIsSyncing(false);
      }

      navigate(skipOnboarding ? ROOT_ROUTES.ROOT : ROOT_ROUTES.ONBOARDING);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return googleLogin;
}
