import React from "react";
import { OnboardingFooter, OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingStepBoilerplate } from "../../components/OnboardingStepBoilerplate";

export const SignInWithGoogleSuccess: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <OnboardingText>Thank you, good sir</OnboardingText>

      <OnboardingText>
        The crew will attend to your things as we continue.
      </OnboardingText>
      <OnboardingFooter onSkip={onSkip} onPrev={onPrevious} onNext={onNext} />
    </OnboardingStepBoilerplate>
  );
};
