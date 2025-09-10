import React from "react";
import { FixedOnboardingFooter } from "../FixedOnboardingFooter";
import { OnboardingContainer, OnboardingStepProps } from "../Onboarding";
import { OnboardingStep } from "../OnboardingStep";
import { OnboardingCard } from "../styled";

interface OnboardingStepBoilerplateProps
  extends Omit<OnboardingStepProps, "onComplete"> {
  children: React.ReactNode;
  hideSkip?: boolean;
  nextBtnDisabled?: boolean;
  prevBtnDisabled?: boolean;
  showFooter?: boolean;
}

export const OnboardingCardLayout = (props: OnboardingStepBoilerplateProps) => {
  const {
    currentStep,
    totalSteps,
    children,
    hideSkip,
    nextBtnDisabled,
    prevBtnDisabled,
    showFooter = true,
    onNext,
    onPrevious,
    onSkip,
  } = props;

  return (
    <>
      <OnboardingContainer>
        <OnboardingCard hideBorder={true} style={{ paddingBottom: "100px" }}>
          <OnboardingStep currentStep={currentStep} totalSteps={totalSteps}>
            {children}
          </OnboardingStep>
          {showFooter && (
            <FixedOnboardingFooter
              onSkip={onSkip}
              onPrev={onPrevious}
              onNext={onNext}
              hideSkip={hideSkip}
              nextBtnDisabled={nextBtnDisabled}
              prevBtnDisabled={prevBtnDisabled}
            />
          )}
        </OnboardingCard>
      </OnboardingContainer>
    </>
  );
};
