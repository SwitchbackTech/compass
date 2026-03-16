import { type FC, useCallback, useEffect, useRef, useState } from "react";
import EmailPassword from "supertokens-web-js/recipe/emailpassword";
import { DotIcon } from "@phosphor-icons/react";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { useCompleteAuthentication } from "@web/auth/hooks/useCompleteAuthentication";
import {
  type ForgotPasswordFormData,
  type LogInFormData,
  type ResetPasswordFormData,
  type SignUpFormData,
} from "@web/auth/schemas/auth.schemas";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { GoogleButton } from "@web/components/oauth/google/GoogleButton";
import { AuthButton } from "./components/AuthButton";
import { ForgotPasswordForm } from "./forms/ForgotPasswordForm";
import { LogInForm } from "./forms/LogInForm";
import { ResetPasswordForm } from "./forms/ResetPasswordForm";
import { SignUpForm } from "./forms/SignUpForm";
import { useAuthModal } from "./hooks/useAuthModal";
import { useAuthUrlParam } from "./hooks/useAuthUrlParam";

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
  const completeAuthentication = useCompleteAuthentication();

  // Handle URL-based auth modal triggers (e.g., ?auth=signup)
  useAuthUrlParam(openModal);
  const [signUpName, setSignUpName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const prevViewRef = useRef(currentView);

  useEffect(() => {
    if (prevViewRef.current !== "signUp" && currentView === "signUp") {
      setSignUpName("");
    }
    setSubmitError(null);
    prevViewRef.current = currentView;
  }, [currentView]);

  const handleSwitchAuth = useCallback(
    () => setView(currentView === "login" ? "signUp" : "login"),
    [currentView, setView],
  );

  const handleGoogleSignIn = useCallback(() => {
    googleAuth.login();
    closeModal();
  }, [googleAuth, closeModal]);

  const handleSignUp = useCallback(
    async (data: SignUpFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const response = await EmailPassword.signUp({
          formFields: [
            { id: "name", value: data.name },
            { id: "email", value: data.email },
            { id: "password", value: data.password },
          ],
        });

        switch (response.status) {
          case "OK":
            await completeAuthentication({
              email: response.user.emails[0] ?? data.email,
              onComplete: closeModal,
            });
            return;
          case "FIELD_ERROR":
            setSubmitError(response.formFields[0]?.error ?? "Sign up failed");
            return;
          case "SIGN_UP_NOT_ALLOWED":
            setSubmitError(response.reason);
            return;
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Unable to sign up",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [closeModal, completeAuthentication],
  );

  const handleLogin = useCallback(
    async (data: LogInFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const response = await EmailPassword.signIn({
          formFields: [
            { id: "email", value: data.email },
            { id: "password", value: data.password },
          ],
        });

        switch (response.status) {
          case "OK":
            await completeAuthentication({
              email: response.user.emails[0] ?? data.email,
              onComplete: closeModal,
            });
            return;
          case "WRONG_CREDENTIALS_ERROR":
            setSubmitError("Incorrect email or password.");
            return;
          case "FIELD_ERROR":
            setSubmitError(response.formFields[0]?.error ?? "Log in failed");
            return;
          case "SIGN_IN_NOT_ALLOWED":
            setSubmitError(response.reason);
            return;
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Unable to log in",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [closeModal, completeAuthentication],
  );

  const handleForgotPassword = useCallback(() => {
    setView("forgotPassword");
  }, [setView]);

  const handleBackToSignIn = useCallback(() => {
    setView("login");
  }, [setView]);

  const handleBackToForgotPassword = useCallback(() => {
    setView("forgotPassword");
  }, [setView]);

  const handleForgotPasswordSubmit = useCallback(
    async (data: ForgotPasswordFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const response = await EmailPassword.sendPasswordResetEmail({
          formFields: [{ id: "email", value: data.email }],
        });

        if (response.status === "FIELD_ERROR") {
          throw new Error(response.formFields[0]?.error ?? "Reset failed");
        }

        if (response.status === "PASSWORD_RESET_NOT_ALLOWED") {
          throw new Error(response.reason);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const handleResetPasswordSubmit = useCallback(
    async (data: ResetPasswordFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const token = EmailPassword.getResetPasswordTokenFromURL();
        const response = await EmailPassword.submitNewPassword({
          formFields: [{ id: "password", value: data.password }],
          token,
        });

        switch (response.status) {
          case "OK":
            setView("login");
            return;
          case "FIELD_ERROR":
            setSubmitError(
              response.formFields[0]?.error ?? "Unable to reset password",
            );
            return;
          case "RESET_PASSWORD_INVALID_TOKEN_ERROR":
            setSubmitError(
              "This reset link is invalid or expired. Request a new one.",
            );
            return;
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Unable to reset password",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [setView],
  );

  if (!isOpen) {
    return null;
  }

  const showAuthSwitch = currentView === "login" || currentView === "signUp";
  const showGoogleAuth = currentView !== "resetPassword";
  const trimmedName = signUpName.trim();
  const title =
    currentView === "forgotPassword"
      ? "Reset Password"
      : currentView === "resetPassword"
        ? "Set New Password"
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
        {currentView === "login" && (
          <LogInForm
            onSubmit={handleLogin}
            onForgotPassword={handleForgotPassword}
            isSubmitting={isSubmitting}
          />
        )}
        {currentView === "forgotPassword" && (
          <ForgotPasswordForm
            onSubmit={handleForgotPasswordSubmit}
            onBackToSignIn={handleBackToSignIn}
            isSubmitting={isSubmitting}
          />
        )}
        {currentView === "resetPassword" && (
          <ResetPasswordForm
            onSubmit={handleResetPasswordSubmit}
            onBackToForgotPassword={handleBackToForgotPassword}
            isSubmitting={isSubmitting}
            error={submitError}
          />
        )}
        {submitError && currentView !== "resetPassword" ? (
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
              {currentView === "login" ? "Sign up" : "Log in"}
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
