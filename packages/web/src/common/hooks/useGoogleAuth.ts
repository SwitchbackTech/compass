import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { useSkipOnboarding } from "@web/auth/useSkipOnboarding";
import { AuthApi } from "@web/common/apis/auth.api";
import { UserApi } from "@web/common/apis/user.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useSession } from "@web/common/hooks/useSession";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { OnboardingStepProps } from "@web/views/Onboarding";

export function useGoogleAuth(props?: Partial<OnboardingStepProps>) {
  const navigate = useNavigate();
  const { setAuthenticated, authenticated } = useSession();
  const { markSignupCompleted } = useHasCompletedSignup();
  const { updateOnboardingStatus, skipOnboarding } = useSkipOnboarding();

  const googleLogin = useGoogleLogin({
    onSuccess: async (data) => {
      await AuthApi.loginOrSignup(data);

      const metadata = await UserApi.getMetadata();

      const skipOnboarding = metadata.skipOnboarding ?? true;

      updateOnboardingStatus(skipOnboarding);

      markSignupCompleted();

      props?.onNext?.();

      setAuthenticated(true);

      if (skipOnboarding) navigate(ROOT_ROUTES.ROOT);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  useEffect(() => {
    if (authenticated && skipOnboarding) {
      navigate(ROOT_ROUTES.ROOT);
    }
  }, [authenticated, navigate, skipOnboarding]);

  return googleLogin;
}
