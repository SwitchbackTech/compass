import { FC, useCallback } from "react";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { SignInFormData, SignUpFormData } from "@web/auth/schemas/auth.schemas";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { GoogleButton } from "@web/components/oauth/google/GoogleButton";
import { AuthTabs } from "./components/AuthTabs";
import { ForgotPasswordForm } from "./forms/ForgotPasswordForm";
import { SignInForm } from "./forms/SignInForm";
import { SignUpForm } from "./forms/SignUpForm";
import { AuthView, useAuthModal } from "./hooks/useAuthModal";

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
  const { isOpen, currentView, closeModal, setView } = useAuthModal();
  const googleAuth = useGoogleAuth();

  const handleTabChange = useCallback(
    (tab: AuthView) => {
      setView(tab);
    },
    [setView],
  );

  const handleGoogleSignIn = useCallback(() => {
    googleAuth.login();
    closeModal();
  }, [googleAuth, closeModal]);

  const handleSignUp = useCallback((_data: SignUpFormData) => {
    // TODO: Implement email/password sign up API call
    // For now, this is UI-only - backend integration will be added later
    console.log("Sign up submitted:", _data);
  }, []);

  const handleSignIn = useCallback((_data: SignInFormData) => {
    // TODO: Implement email/password sign in API call
    // For now, this is UI-only - backend integration will be added later
    console.log("Sign in submitted:", _data);
  }, []);

  const handleForgotPassword = useCallback(() => {
    setView("forgotPassword");
  }, [setView]);

  const handleBackToSignIn = useCallback(() => {
    setView("signIn");
  }, [setView]);

  const handleForgotPasswordSubmit = useCallback((_data: { email: string }) => {
    // TODO: Implement forgot password API call
    // For now, this is UI-only - backend integration will be added later
    console.log("Forgot password submitted:", _data);
  }, []);

  if (!isOpen) {
    return null;
  }

  const showTabs = currentView !== "forgotPassword";
  const title =
    currentView === "forgotPassword" ? "Reset Password" : "Welcome to Compass";

  return (
    <OverlayPanel
      title={title}
      onDismiss={closeModal}
      variant="modal"
      backdrop="light"
    >
      <div className="flex w-full flex-col gap-6">
        {/* Tabs for Sign In / Sign Up */}
        {showTabs && (
          <AuthTabs activeTab={currentView} onTabChange={handleTabChange} />
        )}

        {/* Google Sign In */}
        {showTabs && (
          <>
            <GoogleButton
              onClick={handleGoogleSignIn}
              label={
                currentView === "signUp"
                  ? "Sign up with Google"
                  : "Sign in with Google"
              }
              style={{ width: "100%" }}
            />

            <div className="flex items-center gap-3">
              <div className="bg-border-primary h-px flex-1" />
              <span className="text-text-light text-sm">or</span>
              <div className="bg-border-primary h-px flex-1" />
            </div>
          </>
        )}

        {/* Form based on current view */}
        {currentView === "signUp" && <SignUpForm onSubmit={handleSignUp} />}
        {currentView === "signIn" && (
          <SignInForm
            onSubmit={handleSignIn}
            onForgotPassword={handleForgotPassword}
          />
        )}
        {currentView === "forgotPassword" && (
          <ForgotPasswordForm
            onSubmit={handleForgotPasswordSubmit}
            onBackToSignIn={handleBackToSignIn}
          />
        )}

        {/* Privacy & Terms links */}
        {showTabs && (
          <p className="text-text-light text-center text-xs">
            By continuing, you agree to our{" "}
            <a
              href="https://compasscalendar.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-lighter hover:underline"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://compasscalendar.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-lighter hover:underline"
            >
              Privacy Policy
            </a>
          </p>
        )}
      </div>
    </OverlayPanel>
  );
};
