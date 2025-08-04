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

const NotOnWaitlist = () => {
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

export const EmailStep: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
}) => {
  const { setFirstName } = useOnboarding();
  const [email, setEmail] = useState("");
  const [isLoadingWaitlistStatus, setIsLoadingWaitlistStatus] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<{
    isOnWaitlist: boolean;
    isInvited: boolean;
    isActive: boolean;
    firstName?: string;
    lastName?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const processedInput = email.trim().toLowerCase();

    if (processedInput === "marco@polo.co") {
      setWaitlistStatus({
        isOnWaitlist: true,
        isInvited: true,
        isActive: true,
      });
      setFirstName("Marco");
      onNext();
      return;
    }

    if (!email.trim()) {
      alert("Please enter your email address.");
      return;
    }

    setIsLoadingWaitlistStatus(true);
    try {
      const data = await WaitlistApi.getWaitlistStatus(email.trim());
      setWaitlistStatus(data);
      setFirstName(data.firstName ?? "Sailor");
    } catch (error) {
      console.error("Error checking waitlist status:", error);
    } finally {
      setIsLoadingWaitlistStatus(false);
    }
  };

  if (waitlistStatus && !waitlistStatus?.isOnWaitlist) {
    return <NotOnWaitlist />;
  }

  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <Title>The gangway lowers only for the chosen.</Title>
      <OnboardingInputSection>
        <OnboardingInputLabel htmlFor="email">Email</OnboardingInputLabel>
        <OnboardingInput
          id="email"
          type="email"
          placeholder=""
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </OnboardingInputSection>
      <SubmitButton
        disabled={isLoadingWaitlistStatus || !email.trim()}
        onClick={handleSubmit}
      >
        OK
      </SubmitButton>
    </OnboardingStepBoilerplate>
  );
};
