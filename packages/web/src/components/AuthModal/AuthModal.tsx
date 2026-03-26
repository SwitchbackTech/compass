import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { DotIcon } from "@phosphor-icons/react";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { GoogleButton } from "@web/components/oauth/google/GoogleButton";
import { AuthButton } from "./components/AuthButton";
import { ForgotPasswordForm } from "./forms/ForgotPasswordForm";
import { LogInForm } from "./forms/LogInForm";
import { ResetPasswordForm } from "./forms/ResetPasswordForm";
import { SignUpForm } from "./forms/SignUpForm";
import { useAuthFormHandlers } from "./hooks/useAuthFormHandlers";
import { useAuthModal } from "./hooks/useAuthModal";
import { useAuthUrlParam } from "./hooks/useAuthUrlParam";

function getInitialAuthToken(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const authParam = searchParams.get("auth")?.toLowerCase();

  if (authParam !== "reset" && authParam !== "verify") {
    return undefined;
  }

  return searchParams.get("token") ?? undefined;
}

/**
 * Authentication modal with Sign In, Sign Up, and Forgot Password views
 *
 * Features:
 * - Tab navigation between Sign In and Sign Up
 * - Google OAuth integration via existing useGoogleAuth hook
 * - Email/password forms with Zod validation
 * - Forgot password flow with generic success message
 * - Accessible modal with proper ARIA attributes
 */
export const AuthModal: FC = () => {
  const { isOpen, currentView, openModal, closeModal, setView } =
    useAuthModal();
  const googleAuth = useGoogleAuth();
  const isLoginView =
    currentView === "login" ||
    currentView === "loginAfterReset" ||
    currentView === "loginAfterVerify";
  const authToken = useRef(getInitialAuthToken()).current;
  const {
    isSubmitting,
    submitError,
    handleSignUp,
    handleLogin,
    handleForgotPassword,
    handleResetPassword,
    handleVerifyEmail,
  } = useAuthFormHandlers({
    currentView,
    closeModal,
    authToken,
    setView,
  });

  // Handle URL-based auth modal triggers (e.g., ?auth=signup)
  useAuthUrlParam(openModal);
  const [signUpName, setSignUpName] = useState("");
  const prevViewRef = useRef(currentView);

  useEffect(() => {
    if (prevViewRef.current !== "signUp" && currentView === "signUp") {
      setSignUpName("");
    }
    prevViewRef.current = currentView;
  }, [currentView]);

  const hasAttemptedEmailVerificationRef = useRef(false);

  useEffect(() => {
    if (currentView !== "verifyEmail") {
      hasAttemptedEmailVerificationRef.current = false;
      return;
    }

    if (hasAttemptedEmailVerificationRef.current) {
      return;
    }

    hasAttemptedEmailVerificationRef.current = true;
    void handleVerifyEmail();
  }, [currentView, handleVerifyEmail]);

  const handleSwitchAuth = useCallback(
    () => setView(currentView === "signUp" ? "login" : "signUp"),
    [currentView, setView],
  );

  const handleGoogleSignIn = useCallback(() => {
    void googleAuth.login();
    closeModal();
  }, [googleAuth, closeModal]);

  const navigateToForgotPassword = useCallback(() => {
    setView("forgotPassword");
  }, [setView]);

  const handleBackToSignIn = useCallback(() => {
    setView("login");
  }, [setView]);

  const handleBackToForgotPassword = useCallback(() => {
    setView("forgotPassword");
  }, [setView]);

  const handleBackToLogin = useCallback(() => {
    setView("login");
  }, [setView]);

  if (!isOpen) {
    return null;
  }

  const showAuthSwitch = isLoginView || currentView === "signUp";
  const showGoogleAuth =
    currentView !== "resetPassword" && currentView !== "verifyEmail";
  const showSubmitError =
    submitError !== null && (isLoginView || currentView === "signUp");
  const trimmedName = signUpName.trim();
  const title =
    currentView === "forgotPassword"
      ? "Reset Password"
      : currentView === "resetPassword"
        ? "Set New Password"
        : currentView === "verifyEmail"
          ? "Verify Email"
          : currentView === "signUp"
            ? trimmedName
              ? `Nice to meet you, ${trimmedName}`
              : "Nice to meet you"
            : "Hey, welcome back";

  return (
    <OverlayPanel title={title} onDismiss={closeModal} variant="modal">
      <div className="flex w-full flex-col gap-6">
        {/* Form based on current view */}
        {currentView === "signUp" && (
          <SignUpForm
            onSubmit={handleSignUp}
            onNameChange={setSignUpName}
            isSubmitting={isSubmitting}
          />
        )}
        {isLoginView && (
          <LogInForm
            onSubmit={handleLogin}
            onForgotPassword={navigateToForgotPassword}
            isSubmitting={isSubmitting}
            statusMessage={
              currentView === "loginAfterReset"
                ? "Password reset successful. Log in with your new password."
                : currentView === "loginAfterVerify"
                  ? "Email verified. Log in to continue."
                  : null
            }
          />
        )}
        {currentView === "forgotPassword" && (
          <ForgotPasswordForm
            onSubmit={handleForgotPassword}
            onBackToSignIn={handleBackToSignIn}
            isSubmitting={isSubmitting}
          />
        )}
        {currentView === "resetPassword" && (
          <ResetPasswordForm
            onSubmit={handleResetPassword}
            onBackToForgotPassword={handleBackToForgotPassword}
            isSubmitting={isSubmitting}
            error={submitError}
          />
        )}
        {currentView === "verifyEmail" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-text-light text-sm">
              {isSubmitting
                ? "Verifying your email..."
                : submitError
                  ? submitError
                  : "Preparing verification..."}
            </p>
            {!isSubmitting && (
              <AuthButton
                type="button"
                variant={submitError ? "primary" : "outline"}
                onClick={handleBackToLogin}
              >
                Back to log in
              </AuthButton>
            )}
          </div>
        )}
        {showSubmitError ? (
          <p className="text-status-error text-center text-sm" role="alert">
            {submitError}
          </p>
        ) : null}
        {/* Auth switch (Sign In / Sign Up) - only for signIn and signUp views */}
        {showAuthSwitch && (
          <>
            <div className="flex items-center gap-3">
              <div className="bg-border-primary h-px flex-1" />
              <span className="text-text-light text-sm">or</span>
              <div className="bg-border-primary h-px flex-1" />
            </div>
            <AuthButton
              type="button"
              variant="outline"
              onClick={handleSwitchAuth}
            >
              {isLoginView ? "Sign up" : "Log in"}
            </AuthButton>
          </>
        )}
        {/* Google Sign In - at bottom */}
        {showGoogleAuth ? (
          <>
            <div className="flex items-center gap-3">
              <div className="bg-border-primary h-px flex-1" />
              <span className="text-text-light text-sm">or</span>
              <div className="bg-border-primary h-px flex-1" />
            </div>
            <GoogleButton
              onClick={handleGoogleSignIn}
              label="Continue with Google"
              style={{ width: "100%" }}
            />
          </>
        ) : null}
        {/* Privacy & Terms links */}
        <div className="text-text-light-inactive flex items-center justify-center text-center text-xs">
          <a
            href="https://www.compasscalendar.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-lighter hover:underline"
          >
            Terms
          </a>
          <DotIcon size={26} />
          <a
            href="https://www.compasscalendar.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-lighter hover:underline"
          >
            Privacy
          </a>
        </div>
      </div>
    </OverlayPanel>
  );
};
