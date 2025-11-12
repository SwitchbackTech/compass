import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { StringV4Schema } from "@core/types/type.utils";
import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { AuthApi } from "@web/common/apis/auth.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useSession } from "@web/common/hooks/useSession";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { OnboardingStepProps } from "@web/views/Onboarding";

export function useGoogleAuth(props?: Partial<OnboardingStepProps>) {
  const navigate = useNavigate();
  const session = useSession();
  const { markSignupCompleted } = useHasCompletedSignup();
  const isAlreadyAuthenticated = !session.loading && session.authenticated;

  const googleLogin = useGoogleLogin({
    onSuccess: async (data) => {
      await AuthApi.loginOrSignup(data);

      // Set flag to track that user has completed signup
      markSignupCompleted();

      props?.onNext?.();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const isAuthenticated = useMemo(
    () => StringV4Schema.safeParse(googleLogin.data?.code).success,
    [googleLogin.data?.code],
  );

  useEffect(() => {
    if (isAuthenticated || isAlreadyAuthenticated) {
      navigate(ROOT_ROUTES.ROOT);
    }
  }, [isAuthenticated, isAlreadyAuthenticated, navigate]);

  return googleLogin;
}
