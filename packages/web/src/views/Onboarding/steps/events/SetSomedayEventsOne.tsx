import React from "react";
import { OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingCardLayout } from "../../components/layouts/OnboardingCardLayout";

export const SetSomedayEventsOne: React.FC<OnboardingStepProps> = ({
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
        Having a fancy Reminder is great, but what about all the nitty-gritty
        tasks that the sea requires?
      </OnboardingText>

      <OnboardingText>
        We cannot let those fall through the cracks.
      </OnboardingText>
    </OnboardingCardLayout>
  );
};
