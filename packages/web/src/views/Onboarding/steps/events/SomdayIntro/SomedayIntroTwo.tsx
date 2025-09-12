import React from "react";
import { OnboardingText } from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { OnboardingCardLayout } from "../../../components/layouts/OnboardingCardLayout";

export const SomedayIntroTwo: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onPrevious,
}) => {
  return (
    <OnboardingCardLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onSkip={onSkip}
      onPrevious={onPrevious}
      onNext={onNext}
    >
      <OnboardingText>
        Thankfully, you can store future tasks in the sidebar.
      </OnboardingText>

      <OnboardingText>
        Keeping those next to your schedule helps you stay on top of things.
      </OnboardingText>

      <OnboardingText>Let's see how that looks.</OnboardingText>
    </OnboardingCardLayout>
  );
};
