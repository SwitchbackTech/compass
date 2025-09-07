import React from "react";
import { OnboardingFooter, OnboardingText } from "../components";
import { OnboardingStepProps } from "../components/Onboarding";
import { OnboardingStepBoilerplate } from "../components/OnboardingStepBoilerplate";

export const SetSomedayEventsOne: React.FC<OnboardingStepProps> = ({
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
        You’ll focus on that ONE thing for this week, but what about everything
        else?{" "}
      </OnboardingText>

      <OnboardingText>
        Much like the sirens who lure distractable sailors with their songs,
        these tasks will tempt you away from your focus.
      </OnboardingText>

      <OnboardingText>You must not let them. </OnboardingText>

      <OnboardingText>
        But do not completely ignore these tasks, either.
      </OnboardingText>

      <OnboardingFooter onSkip={onSkip} onPrev={onPrevious} onNext={onNext} />
    </OnboardingStepBoilerplate>
  );
};
