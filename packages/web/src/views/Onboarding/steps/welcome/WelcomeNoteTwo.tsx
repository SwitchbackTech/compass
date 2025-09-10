import React from "react";
import { OnboardingCardLayout, OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";

export const WelcomeNoteTwo: React.FC<OnboardingStepProps> = ({
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
      hideSkip={true}
      onSkip={onSkip}
      onPrevious={onPrevious}
      onNext={onNext}
    >
      <OnboardingText>
        To protect yourself from these forces, you&apos;ll need this one thing
        at all times:
      </OnboardingText>

      <OnboardingText style={{ fontSize: "2em", margin: "2em 0" }}>
        FOCUS.
      </OnboardingText>

      <OnboardingText>
        Compass Calendar will help you stay focused on what matters to you, one
        week at a time.
      </OnboardingText>

      <OnboardingText>Let me show you how.</OnboardingText>
    </OnboardingCardLayout>
  );
};
