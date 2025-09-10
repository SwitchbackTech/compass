import React from "react";
import { OnboardingCardLayout, OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";

export const ReminderIntroTwo: React.FC<OnboardingStepProps> = ({
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
        Compass solves this by showing a Reminder at the top of your calendar.
      </OnboardingText>

      <OnboardingText>
        A Reminder can be a goal, intention, or quote.
      </OnboardingText>

      <OnboardingText>
        The only thing that matters is it helps you invest your time wisely.
      </OnboardingText>
    </OnboardingCardLayout>
  );
};
