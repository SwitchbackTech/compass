import React, { useState } from "react";
import styled from "styled-components";
import { WaitlistApi } from "@web/common/apis/waitlist.api";
import { WAITLIST_URL } from "@web/common/constants/web.constants";
import {
  OnboardingButton,
  OnboardingCardLayout,
  OnboardingInput,
  OnboardingInputLabel,
  OnboardingInputSection,
  OnboardingLink,
  OnboardingText,
} from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { useOnboarding } from "../../components/OnboardingContext";
import { OnboardingForm } from "../../components/OnboardingForm";

const Title = styled(OnboardingText)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SubmitButton = styled(OnboardingButton)`
  margin-top: ${({ theme }) => theme.spacing.l};
`;

const NotInvited = () => {
  return (
    <OnboardingCardLayout
      currentStep={1}
      totalSteps={1}
      onNext={() => {}}
      onPrevious={() => {}}
      onSkip={() => {}}
      showFooter={false}
    >
      <OnboardingText>You&apos;re not on the crew list yet.</OnboardingText>
      <OnboardingText>
        Sign up to get notified when a spot opens up.
      </OnboardingText>
      <OnboardingLink href={WAITLIST_URL} target="_blank" rel="noreferrer">
        JOIN CREW LIST
      </OnboardingLink>
    </OnboardingCardLayout>
  );
};

const OnWaitlistButNotInvited = () => {
  return (
    <OnboardingCardLayout
      currentStep={1}
      totalSteps={1}
      onNext={() => {}}
      onPrevious={() => {}}
      onSkip={() => {}}
      showFooter={false}
    >
      <OnboardingText>
        You&apos;re on the crew list but not invited yet.
      </OnboardingText>
      <OnboardingText>
        We&apos;ll let you know when you&apos;re invited.
      </OnboardingText>
    </OnboardingCardLayout>
  );
};

export const WaitlistCheck: React.FC<OnboardingStepProps> = ({
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

    setIsLoadingWaitlistStatus(true);
    try {
      const data = await WaitlistApi.getWaitlistStatus(processedInput);
      setWaitlistStatus(data);
      setFirstName(data.firstName ?? "Sailor");

      if ((data.isOnWaitlist && data.isInvited) || data.isActive) {
        onNext();
      }
    } catch (error) {
      console.error("Error checking waitlist status:", error);
    } finally {
      setIsLoadingWaitlistStatus(false);
    }
  };

  if (
    waitlistStatus &&
    !waitlistStatus?.isOnWaitlist &&
    !waitlistStatus?.isInvited
  ) {
    return <NotInvited />;
  }

  if (
    waitlistStatus &&
    waitlistStatus?.isOnWaitlist &&
    !waitlistStatus?.isInvited
  ) {
    return <OnWaitlistButNotInvited />;
  }

  return (
    <OnboardingCardLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrevious={() => {}}
      onSkip={() => {}}
      showFooter={false}
    >
      <Title>The gangway lowers only for the chosen.</Title>
      <OnboardingForm onSubmit={handleSubmit}>
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
          type="submit"
          disabled={isLoadingWaitlistStatus || !email.trim()}
        >
          OK
        </SubmitButton>
      </OnboardingForm>
    </OnboardingCardLayout>
  );
};
