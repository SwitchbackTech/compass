import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthCheck } from "@web/auth/useAuthCheck";
import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { AuthApi } from "@web/common/apis/auth.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { LoginAbsoluteOverflowLoader } from "@web/components/LoginAbsoluteOverflowLoader/LoginAbsoluteOverflowLoader";
import { GoogleButton } from "@web/components/oauth/google/GoogleButton";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import {
  Card,
  CardHeader,
  InfoText,
  SignInButtonWrapper,
  StyledLogin,
  StyledLoginContainer,
  Subtitle,
  Title,
} from "./styled";

export const LoginView = () => {
  const navigate = useNavigate();

  const { isAuthenticated: isAlreadyAuthenticated } = useAuthCheck();
  const { markSignupCompleted } = useHasCompletedSignup();

  const {
    login: startLoginFlow,
    data: googleLoginData,
    loading: isGoogleLoginLoading,
  } = useGoogleLogin({
    onSuccess: async (code) => {
      await AuthApi.loginOrSignup(code);

      // Set flag to track that user has completed signup
      markSignupCompleted();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const isAuthenticating = isGoogleLoginLoading;
  const isAuthenticated = !!googleLoginData?.code;

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROOT_ROUTES.ROOT);
    }
  }, [isAuthenticated, navigate]);

  const handleButtonClick = () => {
    // This is for the Google Sign-In button
    if (isAlreadyAuthenticated) {
      navigate(ROOT_ROUTES.ROOT);
      return;
    }
    // Proceed directly to the main login flow.
    startLoginFlow();
  };

  return (
    <>
      <StyledLoginContainer>
        <StyledLogin
          alignItems={AlignItems.CENTER}
          direction={FlexDirections.COLUMN}
        >
          {isAuthenticating && <LoginAbsoluteOverflowLoader />}

          <Card>
            <CardHeader>
              <Title>Compass</Title>
              <Subtitle>The weekly planner for ambitious minimalists</Subtitle>
            </CardHeader>

            <InfoText>Sign in with Google to get started.</InfoText>
            <SignInButtonWrapper>
              <GoogleButton
                onClick={handleButtonClick}
                disabled={isAuthenticating}
              />
            </SignInButtonWrapper>
            {isAuthenticating && <InfoText>Connecting to Google...</InfoText>}
          </Card>
        </StyledLogin>
      </StyledLoginContainer>
    </>
  );
};
