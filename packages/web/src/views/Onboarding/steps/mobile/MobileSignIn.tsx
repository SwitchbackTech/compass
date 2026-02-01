import React from "react";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { GoogleButton } from "@web/components/oauth/google/GoogleButton";
import { OnboardingStepProps } from "@web/views/Onboarding/components/Onboarding";
import { OnboardingCardLayout } from "@web/views/Onboarding/components/layouts/OnboardingCardLayout";

export const MobileSignIn: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const googleAuth = useGoogleAuth({ onNext });

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
          marginTop: "60px",
          marginBottom: "60px",
        }}
      />
      {googleAuth.loading ? <AbsoluteOverflowLoader /> : null}
    </OnboardingCardLayout>
  );
};
