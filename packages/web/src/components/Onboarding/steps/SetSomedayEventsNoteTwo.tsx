import React, { useEffect, useState } from "react";
import {
  DynamicLogo,
  OnboardingButton,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../components";
import { OnboardingStepProps } from "../components/Onboarding";

export const SetSomedayEventsNoteTwo: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
}) => {
  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <OnboardingText>
        I can see that you now understand that Compass helps you focus on what
        matters to you.{" "}
      </OnboardingText>

      <OnboardingText>
        Your cabin is set up, and the crew is aboard.{" "}
      </OnboardingText>

      <DynamicLogo />

      <OnboardingText>It’s finally time.</OnboardingText>
      <OnboardingButton onClick={() => onNext()}>Enter</OnboardingButton>
    </OnboardingStepBoilerplate>
  );
};
