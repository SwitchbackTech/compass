import React, { useState } from "react";
import { toast } from "react-toastify";
import styled from "styled-components";
import { z } from "zod";
import { WaitlistApi } from "@web/common/apis/waitlist.api";
import {
  OnboardingButton,
  OnboardingCardLayout,
  OnboardingInput,
  OnboardingInputLabel,
  OnboardingInputSection,
  OnboardingText,
} from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { useOnboarding } from "../../components/OnboardingContext";
import { OnboardingForm } from "../../components/OnboardingForm";

// Email validation schema using Zod
const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address");

// Types for waitlist check result
type NextAction = "SHOW_WAITLIST_BTN" | "NEXT_BTN";

interface WaitlistCheckResult {
  toastMessage: string;
  nextAction: NextAction;
}

// Parse waitlist API response and return appropriate message and action
const parseWaitlistCheck = (data: {
  isOnWaitlist: boolean;
  isInvited: boolean;
  isActive: boolean;
  firstName?: string;
}): WaitlistCheckResult => {
  if ((data.isOnWaitlist && data.isInvited) || data.isActive) {
    return {
      toastMessage: "Welcome aboard! You're ready to set sail.",
      nextAction: "NEXT_BTN",
    };
  } else if (data.isOnWaitlist && !data.isInvited) {
    return {
      toastMessage:
        "You're on the crew list but not invited yet. We'll let you know when you're invited.",
      nextAction: "SHOW_WAITLIST_BTN",
    };
  } else {
    return {
      toastMessage:
        "You're not on the crew list yet. Sign up to get notified when a spot opens up.",
      nextAction: "SHOW_WAITLIST_BTN",
    };
  }
};

const Title = styled(OnboardingText)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SubmitButton = styled(OnboardingButton)`
  margin-top: ${({ theme }) => theme.spacing.l};
`;

export const MobileWaitlistCheck: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
}) => {
  const { setFirstName } = useOnboarding();
  const [email, setEmail] = useState("");
  const [isLoadingWaitlistStatus, setIsLoadingWaitlistStatus] = useState(false);
  const [nextAction, setNextAction] = useState<NextAction>("NEXT_BTN");

  const isValidEmail = (email: string) => {
    try {
      EmailSchema.parse(email);
      return true;
    } catch {
      return false;
    }
  };

  const checkWaitlistStatus = async () => {
    if (!email.trim() || !isValidEmail(email)) {
      return; // Don't proceed if email is invalid
    }

    const processedInput = email.trim().toLowerCase();
    setIsLoadingWaitlistStatus(true);

    try {
      const data = await WaitlistApi.getWaitlistStatus(processedInput);
      console.log("API Response:", data);
      setFirstName(data.firstName ?? "Sailor");

      const result = parseWaitlistCheck(data);
      console.log("Parsed result:", result);

      setNextAction(result.nextAction);

      if (result.nextAction === "NEXT_BTN") {
        toast.success(result.toastMessage);
        onNext();
      } else {
        // For waitlist users not invited, use info toast
        if (data.isOnWaitlist && !data.isInvited) {
          toast.info(result.toastMessage);
        } else {
          // For users not on waitlist, use warning toast
          toast.warning(result.toastMessage);
        }
      }
    } catch (error) {
      console.error("Error checking waitlist status:", error);
      toast.error("Failed to check waitlist status. Please try again.");
    } finally {
      setIsLoadingWaitlistStatus(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkWaitlistStatus();
  };

  const handleContinue = () => {
    checkWaitlistStatus();
  };

  const handleWaitlistSignup = () => {
    window.open("https://www.compasscalendar.com/waitlist", "_blank");
  };

  return (
    <OnboardingCardLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrevious={() => {}}
      onSkip={() => {}}
      showFooter={false}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
        }}
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
            type="button"
            onClick={
              nextAction === "NEXT_BTN" ? handleContinue : handleWaitlistSignup
            }
            disabled={isLoadingWaitlistStatus || !isValidEmail(email)}
          >
            {isLoadingWaitlistStatus
              ? "Checking..."
              : nextAction === "NEXT_BTN"
                ? "Continue"
                : "Signup For Waitlist"}
          </SubmitButton>
        </OnboardingForm>
      </div>
    </OnboardingCardLayout>
  );
};
