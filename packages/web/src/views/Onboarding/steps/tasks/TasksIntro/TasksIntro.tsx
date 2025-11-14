import React from "react";
import { OnboardingText } from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { OnboardingCardLayout } from "../../../components/layouts/OnboardingCardLayout";

export const TaskIntro: React.FC<OnboardingStepProps> = ({
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
        You can capture all kinds of tasks in Compass.
      </OnboardingText>

      <OnboardingText>
        We&apos;ll always put them next to your schedule to help you stay on top
        of things.
      </OnboardingText>

      <OnboardingText>Let&apos;s see how that looks.</OnboardingText>
    </OnboardingCardLayout>
  );
};
