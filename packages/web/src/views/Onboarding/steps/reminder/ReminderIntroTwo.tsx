import React from "react";
import {
  OnboardingFooter,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";

export const ReminderIntroTwo: React.FC<OnboardingStepProps> = ({
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
      <OnboardingText>
        Compass solves this by showing a Reminder at the top of your calendar.
      </OnboardingText>

      <OnboardingText>
        A Reminder can be a goal, intention, or quote.
      </OnboardingText>

      <OnboardingText>
        The only thing that matters is it helps you invest your time wisely.
      </OnboardingText>

      <OnboardingFooter onSkip={onSkip} onPrev={onPrevious} onNext={onNext} />
    </OnboardingStepBoilerplate>
  );
};
