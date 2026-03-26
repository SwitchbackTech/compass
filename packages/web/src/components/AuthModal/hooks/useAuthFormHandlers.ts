import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import EmailPassword from "supertokens-web-js/recipe/emailpassword";
import EmailVerification from "supertokens-web-js/recipe/emailverification";
import { z } from "zod";
import { useCompleteAuthentication } from "@web/auth/hooks/useCompleteAuthentication";
import {
  type ForgotPasswordFormData,
  type LogInFormData,
  type ResetPasswordFormData,
  type SignUpFormData,
} from "@web/auth/schemas/auth.schemas";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";
import { type AuthView } from "./useAuthModal";

const AUTH_TOKEN_QUERY_SCHEMA = z.object({
  token: z.string().min(1).optional(),
});

function getAuthTokenQueryParams(): z.infer<typeof AUTH_TOKEN_QUERY_SCHEMA> {
  if (typeof window === "undefined") return {};
  const searchParams = new URLSearchParams(window.location.search);
  const parsed = AUTH_TOKEN_QUERY_SCHEMA.safeParse({
    token: searchParams.get("token") ?? undefined,
  });
  return parsed.success ? parsed.data : {};
}

function updateCurrentUrlSearchParams(
  updateSearchParams: (searchParams: URLSearchParams) => void,
): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  updateSearchParams(url.searchParams);
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;

  window.history.replaceState(window.history.state, "", nextUrl);
}

interface UseAuthFormHandlersOptions {
  currentView: AuthView;
  closeModal: () => void;
  authToken?: string;
  setView: (view: AuthView) => void;
}

export interface UseAuthFormHandlersResult {
  isSubmitting: boolean;
  submitError: string | null;
  handleSignUp: (data: SignUpFormData) => Promise<void>;
  handleLogin: (data: LogInFormData) => Promise<void>;
  handleForgotPassword: (data: ForgotPasswordFormData) => Promise<void>;
  handleResetPassword: (data: ResetPasswordFormData) => Promise<void>;
  handleVerifyEmail: () => Promise<void>;
}

export function useAuthFormHandlers({
  currentView,
  closeModal,
  authToken,
  setView,
}: UseAuthFormHandlersOptions): UseAuthFormHandlersResult {
  const completeAuthentication = useCompleteAuthentication();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initialAuthToken = useMemo(() => {
    const propToken = z
      .string()
      .min(1)
      .safeParse(authToken ?? "");
    if (propToken.success) return propToken.data;
    return getAuthTokenQueryParams().token;
  }, [authToken]);

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
            });

            try {
              const verificationResponse =
                await EmailVerification.sendVerificationEmail();

              if (verificationResponse.status === "OK") {
                toast.success(
                  "Check your inbox to verify your email.",
                  toastDefaultOptions,
                );
              }
            } catch (verificationError) {
              console.error(
                "Failed to send verification email after sign up:",
                verificationError,
              );
              toast.error(
                "Your account was created, but we could not send a verification email.",
                toastDefaultOptions,
              );
            }

            closeModal();
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

      try {
        const response = await EmailPassword.sendPasswordResetEmail({
          formFields: [{ id: "email", value: data.email }],
        });

        switch (response.status) {
          case "OK":
            return;
          case "FIELD_ERROR":
            throw new Error(
              response.formFields[0]?.error ?? "Unable to send reset email",
            );
          case "PASSWORD_RESET_NOT_ALLOWED":
            throw new Error(response.reason);
        }
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("Unable to send reset email");
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
        // `supertokens-web-js` reads the reset token from the URL query param.
        // We keep the first token we saw (from props or URL) so the flow still works even if the URL changes.
        const token = initialAuthToken;

        if (token) {
          updateCurrentUrlSearchParams((searchParams) => {
            searchParams.set("token", token);
          });
        }
        const response = await EmailPassword.submitNewPassword({
          formFields: [{ id: "password", value: data.password }],
        });

        switch (response.status) {
          case "OK":
            updateCurrentUrlSearchParams((searchParams) => {
              searchParams.delete("token");
            });
            setView("loginAfterReset");
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
    [initialAuthToken, setView],
  );

  const handleVerifyEmail = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const token = initialAuthToken;

      if (token) {
        updateCurrentUrlSearchParams((searchParams) => {
          searchParams.set("token", token);
        });
      }

      const response = await EmailVerification.verifyEmail();

      switch (response.status) {
        case "OK":
          updateCurrentUrlSearchParams((searchParams) => {
            searchParams.delete("token");
          });
          setView("loginAfterVerify");
          return;
        case "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR":
          setSubmitError(
            "This verification link is invalid or expired. Sign in to request a new one.",
          );
          return;
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to verify email",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [initialAuthToken, setView]);

  return {
    isSubmitting,
    submitError,
    handleSignUp,
    handleLogin,
    handleForgotPassword,
    handleResetPassword,
    handleVerifyEmail,
  };
}
