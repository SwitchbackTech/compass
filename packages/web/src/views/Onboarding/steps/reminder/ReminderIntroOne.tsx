import React from "react";
import { OnboardingFooter } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingStepBoilerplate } from "../../components/OnboardingStepBoilerplate";
import { OnboardingText } from "../../components/styled";

export const ReminderIntroOne: React.FC<OnboardingStepProps> = ({
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
        Compass is where you'll make the most important decisions of your life:
        how to spend your time.
      </OnboardingText>

      <OnboardingText>
        But making wise decisions about your time is hard when the seas are
        stormy.
      </OnboardingText>

      <OnboardingFooter onSkip={onSkip} onPrev={onPrevious} onNext={onNext} />
    </OnboardingStepBoilerplate>
  );
};
