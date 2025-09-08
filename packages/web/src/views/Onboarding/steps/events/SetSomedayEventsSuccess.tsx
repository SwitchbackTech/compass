import React from "react";
import {
  OnboardingFooter,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";

export const SetSomedayEventsSuccess: React.FC<OnboardingStepProps> = ({
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
        Wise choices, these look crucial for this month.
      </OnboardingText>

      <OnboardingText>
        Now you’re already one step closer to getting them done.
      </OnboardingText>

      <OnboardingText>
        With Compass, you’ll always be in charge of your tasks — not the other
        way around.
      </OnboardingText>

      <OnboardingFooter onSkip={onSkip} onPrev={onPrevious} onNext={onNext} />
    </OnboardingStepBoilerplate>
  );
};
