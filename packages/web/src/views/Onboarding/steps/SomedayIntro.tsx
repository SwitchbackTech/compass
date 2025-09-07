import React from "react";
import {
  OnboardingFooter,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../components";
import { OnboardingStepProps } from "../components/Onboarding";

export const SomedayIntro: React.FC<OnboardingStepProps> = ({
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
        Scallywags will complain about the many demands aboard the vessel.
      </OnboardingText>

      <OnboardingText>
        But it&apos;s not that we have too little time to do all the
        things,{" "}
      </OnboardingText>

      <OnboardingText>
        it&apos;s that we do too many things in the time we have.
      </OnboardingText>

      <OnboardingFooter onSkip={onSkip} onPrev={onPrevious} onNext={onNext} />
    </OnboardingStepBoilerplate>
  );
};
