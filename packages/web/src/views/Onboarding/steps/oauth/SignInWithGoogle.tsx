import React, { useEffect } from "react";
import { Key } from "ts-key-enum";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { GoogleButton } from "@web/components/oauth/google/GoogleButton";
import { OnboardingCardLayout } from "@web/views/Onboarding/components";
import { OnboardingStepProps } from "@web/views/Onboarding/components/Onboarding";

export const SignInWithGoogle: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const googleAuth = useGoogleAuth({ onNext });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === Key.Enter || event.key === Key.ArrowRight) &&
        !googleAuth.loading
      ) {
        event.preventDefault();
        event.stopPropagation(); // Prevent the centralized handler from also triggering
        googleAuth.login();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [googleAuth.login, googleAuth.loading]);

  return (
    <OnboardingCardLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      hideSkip
      onSkip={onSkip}
      onPrevious={onPrevious}
      onNext={onNext}
      nextBtnDisabled
      prevBtnDisabled
      showFooter={false}
    >
      <GoogleButton
        disabled={googleAuth.loading}
        onClick={googleAuth.login}
        style={{
          marginTop: "120px",
          marginBottom: "60px",
        }}
      />
      {googleAuth.loading ? <AbsoluteOverflowLoader /> : null}
    </OnboardingCardLayout>
  );
};
