import React from "react";
import { OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingCardLayout } from "../../components/layouts/OnboardingCardLayout";

export const SignInWithGoogleSuccess: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  return (
    <OnboardingCardLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onSkip={onSkip}
      onPrevious={onPrevious}
      onNext={onNext}
      prevBtnDisabled={true}
    >
      <OnboardingText>Thank you, good sir</OnboardingText>

      <OnboardingText>
        The crew will attend to your things as we continue.
      </OnboardingText>
    </OnboardingCardLayout>
  );
};
