import { v4 as uuidv4 } from "uuid";
import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import Session from "supertokens-auth-react/recipe/session";
import { useGoogleLogin } from "@react-oauth/google";
import { ColorNames } from "@core/types/color.types";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { AuthApi } from "@web/common/apis/auth.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { Text } from "@web/components/Text";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import googleSignInBtn from "@web/assets/png/googleSignInBtn.png";

import { GoogleBtnWrapper, StyledLogin } from "./styled";

export const LoginView = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const antiCsrfToken = useRef(uuidv4()).current;

  useEffect(() => {
    const checkSession = async () => {
      const isAlreadyAuthed = await Session.doesSessionExist();
      setIsAuthenticated(isAlreadyAuthed);
    };

    checkSession().catch((e) => {
      alert(e);
      console.log(e);
    });
  }, []);

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
        <StyledLogin
          alignItems={AlignItems.CENTER}
          direction={FlexDirections.COLUMN}
        >
          {isAuthenticating && <AbsoluteOverflowLoader />}

          <Text colorName={ColorNames.WHITE_2} size={30}>
            Welcome to Compass,
          </Text>
          <Text colorName={ColorNames.WHITE_2} size={23}>
            the weekly planner for minimalists
          </Text>

          <Text colorName={ColorNames.WHITE_3} size={18}>
            Almost there! Now let's import events from your Google Calendar
          </Text>

          <GoogleBtnWrapper
            role="button"
            onClick={() => {
              login();
            }}
          >
            <img
              src={googleSignInBtn}
              alt="Continue With Google"
              aria-label="Continue With Google"
            />
          </GoogleBtnWrapper>
        </StyledLogin>
      )}
    </>
  );
};
