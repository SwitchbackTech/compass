import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { AuthApi } from "@web/common/apis/auth.api";
import { useSession } from "@web/common/hooks/useSession";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { OnboardingStepProps } from "@web/views/Onboarding";

export function useGoogleAuth(props?: Partial<OnboardingStepProps>) {
  const session = useSession();
  const { markSignupCompleted } = useHasCompletedSignup();

  const googleLogin = useGoogleLogin({
    onSuccess: async (data) => {
      await AuthApi.loginOrSignup(data);

      // Set flag to track that user has completed signup
      markSignupCompleted();

      props?.onNext?.();

      session.setAuthenticated(true);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return googleLogin;
}
