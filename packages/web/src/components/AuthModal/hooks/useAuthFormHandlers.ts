import { useCallback, useEffect, useState } from "react";
import EmailPassword from "supertokens-web-js/recipe/emailpassword";
import { useCompleteAuthentication } from "@web/auth/hooks/useCompleteAuthentication";
import {
  type ForgotPasswordFormData,
  type LogInFormData,
  type ResetPasswordFormData,
  type SignUpFormData,
} from "@web/auth/schemas/auth.schemas";
import { type AuthView } from "./useAuthModal";

interface UseAuthFormHandlersOptions {
  currentView: AuthView;
  closeModal: () => void;
  setView: (view: AuthView) => void;
}

export function useAuthFormHandlers({
  currentView,
  closeModal,
  setView,
}: UseAuthFormHandlersOptions) {
  const completeAuthentication = useCompleteAuthentication();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setSubmitError(null);
  }, [currentView]);

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

  const handleForgotPassword = useCallback(
    async (data: ForgotPasswordFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const response = await EmailPassword.sendPasswordResetEmail({
          formFields: [{ id: "email", value: data.email }],
        });

        if (response.status === "FIELD_ERROR") {
          setSubmitError(
            response.formFields[0]?.error ?? "Unable to send reset email",
          );
          return;
        }

        if (response.status === "PASSWORD_RESET_NOT_ALLOWED") {
          setSubmitError(response.reason);
          return;
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Unable to send reset email",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const handleResetPassword = useCallback(
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

  return {
    isSubmitting,
    submitError,
    handleSignUp,
    handleLogin,
    handleForgotPassword,
    handleResetPassword,
  };
}
