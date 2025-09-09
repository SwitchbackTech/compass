import React from "react";
import { OnboardingContainer, OnboardingStepProps } from "../Onboarding";
import { OnboardingStep } from "../OnboardingStep";
import { OnboardingCard } from "../styled";

interface OnboardingStepBoilerplateProps
  extends Omit<
    OnboardingStepProps,
    "onNext" | "onPrevious" | "onComplete" | "onSkip"
  > {
  children: React.ReactNode;
}

export const OnboardingCardLayout = (props: OnboardingStepBoilerplateProps) => {
  const { currentStep, totalSteps, children } = props;

  return (
    <OnboardingContainer>
      <OnboardingCard hideBorder={true}>
        <OnboardingStep currentStep={currentStep} totalSteps={totalSteps}>
          {children}
        </OnboardingStep>
      </OnboardingCard>
    </OnboardingContainer>
  );
};
