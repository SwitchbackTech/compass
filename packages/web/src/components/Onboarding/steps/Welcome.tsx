import React, { useState } from "react";
import styled from "styled-components";
import { WaitlistApi } from "@web/common/apis/waitlist.api";
import {
  OnboardingButton,
  OnboardingInput,
  OnboardingInputLabel,
  OnboardingInputSection,
  OnboardingLink,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../components";
import { OnboardingStepProps } from "../components/Onboarding";
import { useOnboarding } from "../components/OnboardingContext";

const Title = styled(OnboardingText)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SubmitButton = styled(OnboardingButton)`
  margin-top: ${({ theme }) => theme.spacing.l};
`;

const NotInvited = () => {
  return (
    <OnboardingStepBoilerplate currentStep={1} totalSteps={1}>
      <OnboardingText>You&apos;re not on the crew list yet.</OnboardingText>
      <OnboardingText>
        Sign up to get notified when a spot opens up.
      </OnboardingText>
      <OnboardingLink
        href="https://www.compasscalendar.com/waitlist"
        target="_blank"
        rel="noreferrer"
      >
        JOIN CREW LIST
      </OnboardingLink>
    </OnboardingStepBoilerplate>
  );
};

const OnWaitlistButNotInvited = () => {
  return (
    <OnboardingStepBoilerplate currentStep={1} totalSteps={1}>
      <OnboardingText>
        You&apos;re on the crew list but not invited yet.
      </OnboardingText>
      <OnboardingText>
        We&apos;ll let you know when you&apos;re invited.
      </OnboardingText>
    </OnboardingStepBoilerplate>
  );
};

export const WelcomeStep: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
}) => {
  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <OnboardingText>COMPASS CALENDAR</OnboardingText>
      <OnboardingText>The weekly planner for minimalists</OnboardingText>
      <OnboardingText>Copyright (c) 2025. All Rights Reserved</OnboardingText>
      <OnboardingText>BIOS Version: 20250721</OnboardingText>
      <OnboardingText>2514 KB</OnboardingText>
      <OnboardingText>July 23, 2025</OnboardingText>
      <OnboardingText>15:42:22 UTC</OnboardingText>
      <OnboardingText>Night Vision Check ... 98% Lanterns Lit</OnboardingText>
      Staff Emergency Contacts ... Secured in Cabin
      <OnboardingText>Initializing Compass Alignment ... Done</OnboardingText>
      <OnboardingText>Provisions Check ... Sufficient</OnboardingText>
      <OnboardingText>Rigging Integrity Scan ... All Lines Taut</OnboardingText>
      <OnboardingText>Chart Room Calibration ... Complete</OnboardingText>
      <OnboardingText>Crew Roster Verification ... One Missing</OnboardingText>
      <OnboardingText>Wind Vectors Computed ... Favorable</OnboardingText>
      <OnboardingText>Final Anchor Check ... Ready to Hoist</OnboardingText>
      <OnboardingText>Sails Unfurled ... Awaiting Orders</OnboardingText>
      <OnboardingText>Press Any Key to board</OnboardingText>
    </OnboardingStepBoilerplate>
  );
};
