import React from "react";
import { OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingCardLayout } from "../../components/layouts/OnboardingCardLayout";

export const WelcomeNoteOne: React.FC<OnboardingStepProps> = ({
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
        I see you are eager to board, but I must warn you:
      </OnboardingText>

      <OnboardingText>This journey is full of danger. </OnboardingText>

      <OnboardingText>
        The winds above the surface will push you towards burnout,
      </OnboardingText>

      <OnboardingText>
        while the leviathan below will pull you away from your goals.
      </OnboardingText>
    </OnboardingCardLayout>
  );
};
