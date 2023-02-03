import { v4 as uuidv4 } from "uuid";
import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import Session from "supertokens-auth-react/recipe/session";
import { useGoogleLogin } from "@react-oauth/google";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { AuthApi } from "@web/common/apis/auth.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ColorNames } from "@core/types/color.types";
import { Text } from "@web/components/Text";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import googleSignInBtn from "@web/assets/png/googleSignInBtn.png";

import { GoogleBtnWrapper, StyledLogin } from "./styled";

export const LoginView = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isVerifiedTester, setIsVerifiedTester] = useState(false);

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

  const checkPw = () => {
    const answer = document.getElementById("password").value;
    if (answer === "somedaymaybe") {
      setIsVerifiedTester(true);
    } else {
      alert("sorry, that's not it");
    }
  };

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
        alert("Missing permissions, please try again");
        return;
      }

      setIsAuthenticating(true);

      const { error } = await AuthApi.loginOrSignup(code);

      if (error) {
        alert(
          "An error occured on Compass' backend while logging you in. Please let Ty know:\n ***REMOVED***"
        );
        console.log(error);
        setIsAuthenticating(false);
        return;
      }

      setIsAuthenticating(false);
      setIsAuthenticated(true);
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
            the calm calendar
          </Text>

          {isVerifiedTester ? (
            <>
              <Text colorName={ColorNames.WHITE_3} size={18}>
                Almost there! Now let's import events from your Google Calendar*
              </Text>

              <Text colorName={ColorNames.WHITE_3} size={15}>
                Compass currently only gets events from the *primary* calendar
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
            </>
          ) : (
            <>
              <div style={{ paddingTop: 30 }} />
              <Text colorName={ColorNames.WHITE_2} size={16}>
                Access is currently limited to people on the waitlist.
              </Text>
              <Text colorName={ColorNames.WHITE_2} size={16}>
                If you know the password, enter it below
              </Text>
              <Text colorName={ColorNames.WHITE_2} size={16}>
                If you're already on the waitlist but don't know the pw, keep an
                eye out for an email from ***REMOVED*** within the next few
                weeks
              </Text>
              <form onSubmit={checkPw}>
                <input id="password" name="password" />
                <button>open sesame</button>
              </form>
            </>
          )}
        </StyledLogin>
      )}
    </>
  );
};
