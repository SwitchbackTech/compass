import React from "react";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingCardLayout } from "../../components/layouts/OnboardingCardLayout";
import { OnboardingText } from "../../components/styled";

export const ReminderIntroOne: React.FC<OnboardingStepProps> = ({
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
    >
      <OnboardingText>
        Compass is where you'll make the most important decisions of your life:
        how to spend your time.
      </OnboardingText>

      <OnboardingText>
        But making wise decisions about your time is hard when the seas are
        stormy.
      </OnboardingText>
    </OnboardingCardLayout>
  );
};
