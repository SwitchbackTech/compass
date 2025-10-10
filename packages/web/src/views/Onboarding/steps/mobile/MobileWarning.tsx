import React from "react";
import styled from "styled-components";
import {
  OnboardingButton,
  OnboardingCardLayout,
  OnboardingText,
} from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";

const Title = styled(OnboardingText)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const Message = styled(OnboardingText)`
  margin-bottom: ${({ theme }) => theme.spacing.l};
  text-align: center;
  line-height: 1.6;
`;

const ContinueButton = styled(OnboardingButton)`
  margin-top: ${({ theme }) => theme.spacing.l};
  min-height: 48px;
  font-size: 18px;
`;

export const MobileWarning: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  return (
    <OnboardingCardLayout
      hideSkip={true}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onSkip={onSkip}
      onPrevious={onPrevious}
      onNext={onNext}
      prevBtnDisabled
      showFooter={false}
    >
      <Title>Compass isn't built for mobile yet</Title>

      <Message>
        We're focusing on perfecting the desktop experience first. But you can
        still authenticate with Google to import your calendar events so you're
        ready to go when you access Compass from your laptop.
      </Message>

      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </OnboardingCardLayout>
  );
};
