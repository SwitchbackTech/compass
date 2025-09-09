import React from "react";
import { OnboardingFooter, OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingCardLayout } from "../../components/layouts/OnboardingCardLayout";

export const SetSomedayEventTwo: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onPrevious,
}) => {
  return (
    <OnboardingCardLayout currentStep={currentStep} totalSteps={totalSteps}>
      <OnboardingText>
        Thankfully, you can store future tasks in the sidebar.
      </OnboardingText>

      <OnboardingText>
        Keeping those next to your schedule helps you stay on top of things.
      </OnboardingText>

      <OnboardingText>Let's see how that looks.</OnboardingText>

      <OnboardingFooter onSkip={onSkip} onPrev={onPrevious} onNext={onNext} />
    </OnboardingCardLayout>
  );
};
