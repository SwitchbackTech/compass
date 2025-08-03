import React from "react";
import styled from "styled-components";
import compassGoogleOauthPerms from "@web/assets/png/compass-google-oauth-perms.png";
import {
  OnboardingFooter,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../components";
import { OnboardingStepProps } from "../components/Onboarding";

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
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <OnboardingText>
        Alas, the crew must get permission to take your bags and set up your
        cabin before I can show you around.
      </OnboardingText>

      <OnboardingText>
        Sign in with your Google account and check all the boxes on the next
        screen.
      </OnboardingText>

      <StyledCompassGoogleOauthPerms src={compassGoogleOauthPerms} />

      <OnboardingFooter
        hideSkip
        onSkip={onSkip}
        onPrev={onPrevious}
        onNext={onNext}
      />
    </OnboardingStepBoilerplate>
  );
};
