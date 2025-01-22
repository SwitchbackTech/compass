import { v4 as uuidv4 } from "uuid";
import React, { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import GoogleButton from "react-google-button";
import Session, { signOut } from "supertokens-auth-react/recipe/session";
import { validateGoogleAccessToken } from "@web/auth/gauth.util";
import { useGoogleLogin } from "@react-oauth/google";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { AuthApi } from "@web/common/apis/auth.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { toast } from "react-toastify";
import { SyncApi } from "@web/common/apis/sync.api";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";

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

const clearSession = async () => {
  try {
    await SyncApi.stopWatches();
    await signOut();
  } catch (error) {
    console.error("Failed to clear session", error);
  }
};

export const LoginView = () => {
  const [searchParams] = useSearchParams();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const antiCsrfToken = useRef(uuidv4()).current;

  useEffect(() => {
    const checkSession = async () => {
      const isAlreadyAuthed = await Session.doesSessionExist();
      const isGAuthSessionValid = await validateGoogleAccessToken();
      setIsAuthenticated(isAlreadyAuthed && isGAuthSessionValid);
    };

    const reason = searchParams.get("reason");

    if (reason === AUTH_FAILURE_REASONS.GAUTH_SESSION_EXPIRED) {
      toast.error("Google session expired, please login again");
      clearSession();
    } else {
      checkSession().catch((e) => {
        alert(e);
        console.log(e);
        clearSession();
      });
    }
  }, [searchParams]);

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
      {isAuthenticated ? (
        <Navigate to={ROOT_ROUTES.ROOT} />
      ) : (
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
      )}
    </>
  );
};
