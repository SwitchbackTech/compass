import React from "react";
import { OnboardingText } from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { OnboardingCardLayout } from "../../../components/layouts/OnboardingCardLayout";

export const SomedayEventsIntro: React.FC<OnboardingStepProps> = ({
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
        There&apos;ll be times when you need to do something, but you&apos;re
        not sure when.
      </OnboardingText>
      <OnboardingText>
        Compass has a special place for those in the sidebar.
      </OnboardingText>
      <OnboardingText>
        Let&apos;s track a few of those events now.
      </OnboardingText>
    </OnboardingCardLayout>
  );
};
