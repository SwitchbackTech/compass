import { v4 as uuidv4 } from "uuid";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import GoogleButton from "react-google-button";
import { useGoogleLogin } from "@react-oauth/google";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { AuthApi } from "@web/common/apis/auth.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";

import {
  SignInButtonWrapper,
  Card,
  CardHeader,
  Subtitle,
  StyledLogin,
  Description,
  Title,
  StyledLoginContainer,
} from "./styled";

export const LoginView = () => {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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

  const login = useGoogleLogin({
    flow: "auth-code",
    scope: SCOPES_REQUIRED.join(" "),
    state: antiCsrfToken,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
      console.log(error);
    },
  });

  return (
    <>
      <StyledLoginContainer>
        <StyledLogin
          alignItems={AlignItems.CENTER}
          direction={FlexDirections.COLUMN}
        >
          {isAuthenticating && <AbsoluteOverflowLoader />}

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
                onClick={() => login()}
              />
            </SignInButtonWrapper>
          </Card>
        </StyledLogin>
      </StyledLoginContainer>
    </>
  );
};
