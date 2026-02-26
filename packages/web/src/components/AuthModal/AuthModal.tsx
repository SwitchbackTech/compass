import { FC, useCallback, useEffect, useRef, useState } from "react";
import { DotIcon } from "@phosphor-icons/react";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { SignInFormData, SignUpFormData } from "@web/auth/schemas/auth.schemas";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { GoogleButton } from "@web/components/oauth/google/GoogleButton";
import { AuthButton } from "./components/AuthButton";
import { ForgotPasswordForm } from "./forms/ForgotPasswordForm";
import { SignInForm } from "./forms/SignInForm";
import { SignUpForm } from "./forms/SignUpForm";
import { useAuthModal } from "./hooks/useAuthModal";

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
  const [signUpName, setSignUpName] = useState("");
  const prevViewRef = useRef(currentView);

  useEffect(() => {
    if (prevViewRef.current !== "signUp" && currentView === "signUp") {
      setSignUpName("");
    }
    prevViewRef.current = currentView;
  }, [currentView]);

  const handleSwitchAuth = useCallback(
    () => setView(currentView === "signIn" ? "signUp" : "signIn"),
    [currentView, setView],
  );

  const handleGoogleSignIn = useCallback(() => {
    googleAuth.login();
    closeModal();
  }, [googleAuth, closeModal]);

  const handleSignUp = useCallback((_data: SignUpFormData) => {
    // TODO: Implement email/password sign up API call in Phase 2
    // For now, this is UI-only - backend integration will be added later
  }, []);

  const handleSignIn = useCallback((_data: SignInFormData) => {
    // TODO: Implement email/password sign in API call in Phase 2
    // For now, this is UI-only - backend integration will be added later
  }, []);

  const handleForgotPassword = useCallback(() => {
    setView("forgotPassword");
  }, [setView]);

  const handleBackToSignIn = useCallback(() => {
    setView("signIn");
  }, [setView]);

  const handleForgotPasswordSubmit = useCallback((_data: { email: string }) => {
    // TODO: Implement forgot password API call in Phase 2
    // For now, this is UI-only - backend integration will be added later
  }, []);

  if (!isOpen) {
    return null;
  }

  const showAuthSwitch = currentView !== "forgotPassword";
  const trimmedName = signUpName.trim();
  const title =
    currentView === "forgotPassword"
      ? "Reset Password"
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
          <SignUpForm onSubmit={handleSignUp} onNameChange={setSignUpName} />
        )}
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
              {currentView === "signIn" ? "Sign Up" : "Sign In"}
            </AuthButton>
          </>
        )}
        {/* Google Sign In - at bottom */}
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
