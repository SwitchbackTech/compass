import React, { useEffect } from "react";
import styled from "styled-components";
import { OnboardingNextButton, OnboardingPreviousButton } from "../IconButtons";
import { OnboardingContainer, OnboardingStepProps } from "../Onboarding";
import { OnboardingStep } from "../OnboardingStep";
import { OnboardingButton } from "../styled";

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  gap: 20px;
`;

const TopSection = styled.div`
  background-color: #12151b;
  border: 2px solid #ffffff;
  border-radius: 4px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  width: 100%;
  min-height: 400px;
`;

const SkipButton = styled(OnboardingButton)`
  position: absolute;
  bottom: 20px;
  left: 20px;
`;

const NavigationButtons = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
`;

interface OnboardingTwoRowLayoutProps
  extends Omit<
    OnboardingStepProps,
    "onNext" | "onPrevious" | "onComplete" | "onSkip"
  > {
  content: React.ReactNode;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  nextButtonDisabled?: boolean;
  defaultPreventNavigation?: boolean;
  onNavigationControlChange?: (shouldPrevent: boolean) => void;
  isNavPrevented?: boolean;
}

export const OnboardingTwoRowLayout: React.FC<OnboardingTwoRowLayoutProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  content,
  nextButtonDisabled = false,
  onNavigationControlChange,
  isNavPrevented = false,
}) => {
  // Pass the navigation control function to parent components
  useEffect(() => {
    if (onNavigationControlChange) {
      onNavigationControlChange(isNavPrevented);
    }
  }, [onNavigationControlChange, isNavPrevented]);

  return (
    <OnboardingContainer fullWidth>
      <OnboardingStep currentStep={currentStep} totalSteps={totalSteps}>
        <LayoutContainer>
          <Content>{content}</Content>
          <SkipButton onClick={onSkip}>SKIP INTRO</SkipButton>
          <NavigationButtons>
            <OnboardingPreviousButton onClick={onPrevious} />
            <OnboardingNextButton
              onClick={onNext}
              disabled={nextButtonDisabled}
              shouldTrapFocus={!isNavPrevented}
              shouldPulse={!isNavPrevented}
            />
          </NavigationButtons>
        </LayoutContainer>
      </OnboardingStep>
    </OnboardingContainer>
  );
};
