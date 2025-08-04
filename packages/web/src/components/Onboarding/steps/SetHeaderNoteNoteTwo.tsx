import React from "react";
import { OnboardingFooter, OnboardingText } from "../components";
import { OnboardingStepProps } from "../components/Onboarding";
import { OnboardingStepBoilerplate } from "../components/OnboardingStepBoilerplate";

export const SetHeaderNoteNoteTwo: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onPrevious,
}) => {
  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <OnboardingText>Instead, capture them in the sidebar.</OnboardingText>

      <OnboardingText>Move them forward, back, up, down.</OnboardingText>

      <OnboardingText>
        Then, when the time is right, drag them onto the calendar.
      </OnboardingText>

      <OnboardingFooter onSkip={onSkip} onPrev={onPrevious} onNext={onNext} />
    </OnboardingStepBoilerplate>
  );
};
