import React, { useEffect } from "react";
import styled from "styled-components";
import { OnboardingNextButton, OnboardingPreviousButton } from "../IconButtons";
import { OnboardingContainer, OnboardingStepProps } from "../Onboarding";
import { OnboardingStep } from "../OnboardingStep";
import { OnboardingButton, OnboardingCard } from "../styled";

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
  children?: React.ReactNode;
  content: React.ReactNode;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  nextButtonDisabled?: boolean;
  canNavigateNext?: () => boolean;
}

export const OnboardingTwoRowLayout: React.FC<OnboardingTwoRowLayoutProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  children,
  content,
  nextButtonDisabled = false,
  canNavigateNext,
}) => {
  // Handle keyboard navigation with custom logic
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isRightArrow = event.key === "ArrowRight";
      const isEnter = event.key === "Enter";

      // For right arrow, always check navigation rules
      if (isRightArrow) {
        // If canNavigateNext is provided, use it to determine if navigation should proceed
        if (canNavigateNext && !canNavigateNext()) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        // If canNavigateNext is not provided, use the button disabled state
        if (!canNavigateNext && nextButtonDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        // If navigation is allowed, call onNext
        if (!nextButtonDisabled) {
          onNext();
        }
      }

      // For Enter key, only prevent navigation if not focused on an input
      if (isEnter) {
        const activeElement = document.activeElement as HTMLElement;
        const isInputFocused =
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.contentEditable === "true");

        // If focused on an input, let the input handle the Enter key (for saving)
        if (isInputFocused) {
          return;
        }

        // If not focused on an input, check navigation rules
        if (canNavigateNext && !canNavigateNext()) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (!canNavigateNext && nextButtonDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        // If navigation is allowed, call onNext
        if (!nextButtonDisabled) {
          onNext();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onNext, nextButtonDisabled, canNavigateNext]);

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
            />
          </NavigationButtons>
        </LayoutContainer>
      </OnboardingStep>
    </OnboardingContainer>
  );
};
