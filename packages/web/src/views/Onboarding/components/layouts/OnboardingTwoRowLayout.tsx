import React, { useEffect } from "react";
import styled from "styled-components";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { OnboardingNextButton, OnboardingPreviousButton } from "../IconButtons";
import { OnboardingContainer, OnboardingStepProps } from "../Onboarding";
import { OnboardingStep } from "../OnboardingStep";
import { OnboardingButton } from "../styled";

const TwoRowLayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 20px;
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
      <OnboardingStep currentStep={currentStep} totalSteps={totalSteps} />
      <TwoRowLayoutContainer>
        <Content>{content}</Content>
        <SkipButton onClick={onSkip}>SKIP INTRO</SkipButton>
        <NavigationButtons>
          <TooltipWrapper
            description="Previous step"
            onClick={onPrevious}
            shortcut="J"
          >
            <OnboardingPreviousButton aria-label="Previous" />
          </TooltipWrapper>
          <TooltipWrapper
            description="Next step"
            onClick={nextButtonDisabled ? undefined : onNext}
            shortcut="K"
          >
            <OnboardingNextButton
              aria-label="Next"
              onClick={nextButtonDisabled ? undefined : onNext}
              disabled={nextButtonDisabled}
              shouldTrapFocus={!isNavPrevented}
              shouldPulse={!isNavPrevented}
            />
          </TooltipWrapper>
        </NavigationButtons>
      </TwoRowLayoutContainer>
    </OnboardingContainer>
  );
};
