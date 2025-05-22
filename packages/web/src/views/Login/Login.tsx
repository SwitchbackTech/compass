import React, { useEffect, useRef, useState } from "react";
import GoogleButton from "react-google-button";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuthCheck } from "@web/auth/useAuthCheck";
import { AuthApi } from "@web/common/apis/auth.api";
import { WaitlistApi } from "@web/common/apis/waitlist.api";
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
  WaitlistBtn,
} from "./styled";

export const LoginView = () => {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [waitlistState, setWaitlistState] = useState<
    null | "not_on_list" | "waitlisted"
  >(null);

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

  const checkWaitlistAndLogin = useGoogleLogin({
    scope: "email profile",
    onSuccess: async ({ access_token }) => {
      try {
        const res = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${access_token}` },
          },
        );
        const profile = (await res.json()) as { email?: string };
        const email = profile.email;
        if (!email) {
          alert("Could not retrieve email from Google");
          return;
        }
        const { isInvited, isOnWaitlist } =
          await WaitlistApi.getWaitlistStatus(email);
        if (isInvited) {
          setWaitlistState(null);
          login();
          return;
        }

        setWaitlistState(isOnWaitlist ? "waitlisted" : "not_on_list");
      } catch (e) {
        alert("Failed to check waitlist status");
        console.error(e);
      }
    },
    onError: (error) => {
      alert(`Login failed because: ${error.error}`);
      console.error(error);
    },
  });

  const handleButtonClick = () => {
    if (isAlreadyAuthenticated) {
      navigate(ROOT_ROUTES.ROOT);
    } else {
      login();
      checkWaitlistAndLogin();
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
            {waitlistState === "not_on_list" && (
              <>
                <Description>You're not on the waitlist yet.</Description>
                <WaitlistBtn
                  as="a"
                  href="https://www.compasscalendar.com/waitlist"
                  target="_blank"
                  rel="noreferrer"
                >
                  Join Waitlist
                </WaitlistBtn>
              </>
            )}
            {waitlistState === "waitlisted" && (
              <>
                <Description>
                  You're on the list, but haven't been invited yet.
                </Description>
                <Description>
                  <a
                    href="https://github.com/SwitchbackTech/compass"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Contribute to the codebase
                  </a>
                  ,&nbsp;
                  <a
                    href="https://youtube.com/playlist?list=PLPQAVocXPdjmYaPM9MXzplcwgoXZ_yPiJ&si=ypf5Jg8tZt6Tez36"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch Compass on YouTube
                  </a>
                  , or&nbsp;
                  <a
                    href="https://buymeacoffee.com/tylerdane"
                    target="_blank"
                    rel="noreferrer"
                  >
                    donate
                  </a>
                  .
                </Description>
              </>
            )}
          </Card>
        </StyledLogin>
      </StyledLoginContainer>
    </>
  );
};
