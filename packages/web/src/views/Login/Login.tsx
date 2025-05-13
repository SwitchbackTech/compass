import React, { useEffect, useRef, useState } from "react";
import GoogleButton from "react-google-button";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuthCheck } from "@web/auth/useAuthCheck";
import { AuthApi } from "@web/common/apis/auth.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { LoginAbsoluteOverflowLoader } from "@web/components/LoginAbsoluteOverflowLoader/LoginAbsoluteOverflowLoader";
import {
  Card,
  CardHeader,
  Description,
  SignInButtonWrapper,
  StyledLogin,
  StyledLoginContainer,
  Subtitle,
  Title,
} from "./styled";

export const LoginView = () => {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const { isAuthenticated: isAlreadyAuthenticated } = useAuthCheck();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROOT_ROUTES.ROOT);
    }
  }, [isAuthenticated, navigate]);

  const antiCsrfToken = useRef(uuidv4()).current;

  const SCOPES_REQUIRED = [
    "email",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const isMissingPermissions = (scope: string) => {
    const scopesGranted = scope.split(" ");

    return SCOPES_REQUIRED.some((s) => !scopesGranted.includes(s));
  };

  const handleButtonClick = () => {
    if (isAlreadyAuthenticated) {
      navigate(ROOT_ROUTES.ROOT);
    } else {
      login();
    }
  };

  const login = useGoogleLogin({
    flow: "auth-code",
    scope: SCOPES_REQUIRED.join(" "),
    state: antiCsrfToken,

    onSuccess: async ({ code, scope, state }) => {
      const isFromHacker = state !== antiCsrfToken;

      if (isFromHacker) {
        alert("Nice try, hacker");
        return;
      }

      if (isMissingPermissions(scope)) {
        alert("Missing permissions, please click all the checkboxes");
        return;
      }

      setIsAuthenticating(true);

      try {
        await AuthApi.loginOrSignup(code);
        setIsAuthenticated(true);
      } catch (e) {
        setIsAuthenticating(false);
      }
    },
    onError: (error) => {
      alert(`Login failed because: ${error.error}`);
      console.error(error);
    },
  });

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
              <Title>Welcome to Compass</Title>
              <Subtitle>The weekly planner for minimalists</Subtitle>
            </CardHeader>
            <Description>You're almost ready to start planning!</Description>
            <Description>
              Now let's import your events from Google Calendar
            </Description>
            <SignInButtonWrapper>
              <GoogleButton
                aria-label="Sign in with Google"
                type="light"
                onClick={handleButtonClick}
              />
            </SignInButtonWrapper>
          </Card>
        </StyledLogin>
      </StyledLoginContainer>
    </>
  );
};
