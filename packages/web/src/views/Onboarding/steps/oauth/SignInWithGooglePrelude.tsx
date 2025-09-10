import React from "react";
import styled from "styled-components";
import compassGoogleOauthPerms from "@web/assets/png/google-oauth-preview.png";
import { OnboardingCardLayout, OnboardingText } from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";

const StyledCompassGoogleOauthPerms = styled.img`
  max-width: 100%;
`;

export const SignInWithGooglePrelude: React.FC<OnboardingStepProps> = ({
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
      hideSkip={true}
      onSkip={onSkip}
      onPrevious={onPrevious}
      onNext={onNext}
    >
      <OnboardingText>
        Alas, the crew must get permission to take your bags before I can show
        you around.
      </OnboardingText>

      <OnboardingText>
        Sign in with your Google account and check all the boxes on the next
        screen.
      </OnboardingText>

      <StyledCompassGoogleOauthPerms src={compassGoogleOauthPerms} />
    </OnboardingCardLayout>
  );
};
