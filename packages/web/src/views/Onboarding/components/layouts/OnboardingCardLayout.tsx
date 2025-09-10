import React from "react";
import styled from "styled-components";
import { FixedOnboardingFooter } from "../FixedOnboardingFooter";
import { OnboardingContainer, OnboardingStepProps } from "../Onboarding";
import { OnboardingStep } from "../OnboardingStep";
import { OnboardingCard, OnboardingContent } from "../styled";

const StyledOnboardingCard = styled(OnboardingCard)`
  padding-bottom: 100px;
  margin-top: 60px;
  height: 600px;
  min-height: 600px;
`;

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
        <OnboardingStep currentStep={currentStep} totalSteps={totalSteps} />
        <StyledOnboardingCard hideBorder={true}>
          <OnboardingContent>{children}</OnboardingContent>
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
        </StyledOnboardingCard>
      </OnboardingContainer>
    </>
  );
};
