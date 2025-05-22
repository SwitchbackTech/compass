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
  ActionButton,
  Card,
  CardHeader,
  EmailFormContainer,
  EmailInputField,
  InfoText,
  NavLinkContainer,
  NavLinkIcon,
  NavLinkText,
  SignInButtonWrapper,
  StyledLogin,
  StyledLoginContainer,
  StyledNavLink,
  Subtitle,
  TertiaryButton,
  Title,
} from "./styled";

type FlowStep = "initial" | "checkingWaitlist" | "waitlistStatusKnown";

export const LoginView = () => {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false); // For Google Login process

  // New state for the waitlist check flow
  const [emailInput, setEmailInput] = useState("");
  const [flowStep, setFlowStep] = useState<FlowStep>("initial");
  const [waitlistCheckResult, setWaitlistCheckResult] = useState<{
    isOnWaitlist: boolean;
    isInvited: boolean;
  } | null>(null);
  const [isLoadingWaitlistStatus, setIsLoadingWaitlistStatus] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { isAuthenticated: isAlreadyAuthenticated } = useAuthCheck();
  const antiCsrfToken = useRef(uuidv4()).current;

  useEffect(() => {
    if (window.location.hostname === "localhost") {
      setWaitlistCheckResult({ isOnWaitlist: true, isInvited: true });
      setFlowStep("waitlistStatusKnown");
    }
  }, []);

  useEffect(() => {
    if (flowStep === "initial" && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [flowStep]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROOT_ROUTES.ROOT);
    }
  }, [isAuthenticated, navigate]);

  const SCOPES_REQUIRED = [
    "email",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const isMissingPermissions = (scope: string) => {
    const scopesGranted = scope.split(" ");
    return SCOPES_REQUIRED.some((s) => !scopesGranted.includes(s));
  };

  const startLoginFlow = useGoogleLogin({
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
        console.error(e);
        alert("Login failed. Please try again.");
      } finally {
        setIsAuthenticating(false);
      }
    },
    onError: (error) => {
      alert(`Login failed because: ${error.error}`);
      console.error(error);
    },
  });

  const checkWaitlistAndLogin = useGoogleLogin({
    scope: "email",
    state: antiCsrfToken,
    onSuccess: async ({ access_token, state }) => {
      const isFromHacker = state !== antiCsrfToken;
      if (isFromHacker) {
        alert("Nice try, hacker");
        return;
      }
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
          startLoginFlow();
          return;
        }

        setWaitlistCheckResult({ isOnWaitlist, isInvited });
        setFlowStep("waitlistStatusKnown");
      } catch (e) {
        console.error(e);
        alert("Failed to check waitlist status");
      }
    },
    onError: (error) => {
      alert(`Login failed because: ${error.error}`);
      console.error(error);
    },
  });

  const handleCheckWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const processedInput = emailInput.trim().toLowerCase();

    if (processedInput === "marco@polo.co") {
      setApiError(null); // Clear any previous error
      setWaitlistCheckResult({ isOnWaitlist: true, isInvited: true });
      setFlowStep("waitlistStatusKnown");
      return;
    }

    if (!emailInput.trim()) {
      setApiError("Please enter your email address.");
      return;
    }
    setIsLoadingWaitlistStatus(true);
    setApiError(null);
    setFlowStep("checkingWaitlist");
    try {
      const data = await WaitlistApi.getWaitlistStatus(emailInput.trim());
      setWaitlistCheckResult(data);
      setFlowStep("waitlistStatusKnown");
    } catch (error) {
      console.error("Error checking waitlist status:", error);
      setApiError("Failed to check waitlist status. Please try again.");
      setFlowStep("initial"); // Revert to initial to allow retry
    } finally {
      setIsLoadingWaitlistStatus(false);
    }
  };

  const handleButtonClick = () => {
    // This is for the Google Sign-In button
    if (isAlreadyAuthenticated) {
      navigate(ROOT_ROUTES.ROOT);
      return;
    }
    // If this button is visible, it means the user is invited.
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

            {flowStep === "initial" && (
              <>
                <InfoText>
                  Compass is currently invite-only. Please enter your email to
                  check your waitlist status.
                </InfoText>
                <EmailFormContainer onSubmit={handleCheckWaitlistSubmit}>
                  <EmailInputField
                    type="email"
                    placeholder="Enter your email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    disabled={isLoadingWaitlistStatus}
                    ref={emailInputRef}
                  />
                  <ActionButton
                    type="submit"
                    disabled={
                      isLoadingWaitlistStatus || emailInput.trim() === ""
                    }
                  >
                    {isLoadingWaitlistStatus
                      ? "Checking..."
                      : "Check Waitlist Status"}
                  </ActionButton>
                </EmailFormContainer>
                {apiError && (
                  <InfoText style={{ color: "red" }}>{apiError}</InfoText>
                )}
              </>
            )}

            {flowStep === "checkingWaitlist" && (
              <InfoText>Checking your status on the waitlist...</InfoText>
            )}

            {flowStep === "waitlistStatusKnown" && waitlistCheckResult && (
              <>
                {!waitlistCheckResult.isOnWaitlist && (
                  <>
                    <InfoText>
                      You are not on the waitlist yet. Sign up to get notified
                      when a spot opens up!
                    </InfoText>
                    <TertiaryButton
                      href="https://www.compasscalendar.com/waitlist"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Sign Up for Waitlist
                    </TertiaryButton>
                  </>
                )}

                {waitlistCheckResult.isOnWaitlist &&
                  !waitlistCheckResult.isInvited && (
                    <>
                      <InfoText>
                        You're on the waitlist! We're carefully reviewing
                        applicants and will notify you once you're invited. In
                        the meantime, you can engage with us in these ways:
                      </InfoText>
                      <NavLinkContainer>
                        <StyledNavLink
                          href="https://github.com/SwitchbackTech/compass"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <NavLinkIcon>👨‍💻</NavLinkIcon>
                          <NavLinkText>
                            View the code (we're open source!)
                          </NavLinkText>
                        </StyledNavLink>
                        <StyledNavLink
                          href="https://youtube.com/playlist?list=PLPQAVocXPdjmYaPM9MXzplcwgoXZ_yPiJ&si=ypf5Jg8tZt6Tez36"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <NavLinkIcon>📺</NavLinkIcon>
                          <NavLinkText>Watch Compass on YouTube</NavLinkText>
                        </StyledNavLink>
                        <StyledNavLink
                          href="https://buymeacoffee.com/tylerdane"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <NavLinkIcon>☕</NavLinkIcon>
                          <NavLinkText>Support with a donation</NavLinkText>
                        </StyledNavLink>
                      </NavLinkContainer>
                    </>
                  )}

                {waitlistCheckResult.isOnWaitlist &&
                  waitlistCheckResult.isInvited && (
                    <>
                      <InfoText>
                        Great news! You're invited to join Compass. Sign in with
                        Google to get started.
                      </InfoText>
                      <SignInButtonWrapper>
                        <GoogleButton
                          aria-label="Sign in with Google"
                          type="light"
                          onClick={handleButtonClick}
                          disabled={isAuthenticating}
                        />
                      </SignInButtonWrapper>
                      {isAuthenticating && (
                        <InfoText>Connecting to Google...</InfoText>
                      )}
                    </>
                  )}
              </>
            )}
            {/* Render API error if it occurred during the Google login phase, distinct from waitlist check error */}
            {isAuthenticating && apiError && (
              <InfoText style={{ color: "red" }}>{apiError}</InfoText>
            )}
          </Card>
        </StyledLogin>
      </StyledLoginContainer>
    </>
  );
};
