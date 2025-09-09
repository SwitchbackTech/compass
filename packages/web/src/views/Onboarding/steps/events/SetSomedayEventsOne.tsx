import React from "react";
import { OnboardingFooter, OnboardingText } from "../../components";
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
    <OnboardingCardLayout currentStep={currentStep} totalSteps={totalSteps}>
      <OnboardingText>
        Having a fancy Reminder is great, but what about all the nitty-gritty
        tasks that the sea requires?
      </OnboardingText>

      <OnboardingText>
        We cannot let those fall through the cracks.
      </OnboardingText>

      <OnboardingFooter onSkip={onSkip} onPrev={onPrevious} onNext={onNext} />
    </OnboardingCardLayout>
  );
};
