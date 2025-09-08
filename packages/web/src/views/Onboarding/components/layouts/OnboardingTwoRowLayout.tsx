import React from "react";
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

const BottomSection = styled.div`
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
  topContent: React.ReactNode;
  bottomContent: React.ReactNode;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export const OnboardingTwoRowLayout: React.FC<OnboardingTwoRowLayoutProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  children,
  topContent,
  bottomContent,
}) => {
  return (
    <OnboardingContainer fullWidth>
      <OnboardingCard hideBorder={true}>
        <OnboardingStep currentStep={currentStep} totalSteps={totalSteps}>
          <LayoutContainer>
            <TopSection>
              {topContent}
              <SkipButton onClick={onSkip}>SKIP INTRO</SkipButton>
              <NavigationButtons>
                <OnboardingPreviousButton onClick={onPrevious} />
                <OnboardingNextButton onClick={onNext} />
              </NavigationButtons>
            </TopSection>
            <BottomSection>{bottomContent}</BottomSection>
          </LayoutContainer>
        </OnboardingStep>
      </OnboardingCard>
    </OnboardingContainer>
  );
};
