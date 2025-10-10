import React, { useState } from "react";
import { z } from "zod";
import { WaitlistApi } from "@web/common/apis/waitlist.api";
import { WAITLIST_URL } from "@web/common/constants/web.constants";
import {
  OnboardingCardLayout,
  OnboardingInput,
  OnboardingInputLabel,
  OnboardingInputSection,
  OnboardingText,
} from "../../../components";
import { OnboardingStepProps } from "../../../components/Onboarding";
import { useOnboarding } from "../../../components/OnboardingContext";
import { OnboardingForm } from "../../../components/OnboardingForm";
import { NextAction, parseWaitlistCheck } from "../../../util/waitlist.check";
import { WaitlistButton } from "./WaitlistButton";
import { WaitlistTitle } from "./styled";

// Email validation schema using Zod
const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address");

export const MobileWaitlistCheck: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
}) => {
  const { setFirstName } = useOnboarding();
  const [email, setEmail] = useState("");
  const [isLoadingWaitlistStatus, setIsLoadingWaitlistStatus] = useState(false);
  const [nextAction, setNextAction] = useState<NextAction>("NOTHING");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
      setError("Please enter a valid email address");
      return;
    }

    const processedInput = email.trim().toLowerCase();
    setIsLoadingWaitlistStatus(true);
    setError(""); // Clear any previous errors

    try {
      const data = await WaitlistApi.getWaitlistStatus(processedInput);

      const { nextAction, message, firstName } = parseWaitlistCheck(data);

      if (firstName) {
        setFirstName(firstName);
      }

      setNextAction(nextAction);

      if (nextAction === "SHOW_WAITLIST_BTN") {
        setError(message); // Use the message from parseWaitlistCheck
        setSuccessMessage(""); // Clear success message
      } else if (nextAction === "NEXT_BTN") {
        setError(""); // Clear error for successful users
        setSuccessMessage(message); // Show success message
        // Call onNext() immediately for invited users
        onNext();
      }
    } catch (error) {
      console.error("Error checking waitlist status:", error);
      setError("Failed to check waitlist status. Please try again.");
      setSuccessMessage(""); // Clear success message on error
      setNextAction("NEXT_BTN"); // Keep Continue button on error
    } finally {
      setIsLoadingWaitlistStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await checkWaitlistStatus();
  };

  const handleWaitlistRedirect = () => {
    window.open(WAITLIST_URL, "_blank");
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
        <WaitlistTitle>The gangway lowers only for the chosen.</WaitlistTitle>
        <OnboardingForm onSubmit={handleSubmit}>
          <OnboardingInputSection>
            <OnboardingInputLabel htmlFor="email">Email</OnboardingInputLabel>
            <OnboardingInput
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(""); // Clear error when user starts typing
                if (successMessage) setSuccessMessage(""); // Clear success message when user starts typing
              }}
              autoFocus
              disabled={isLoadingWaitlistStatus}
            />
          </OnboardingInputSection>
          <WaitlistButton
            nextAction={nextAction}
            isLoading={isLoadingWaitlistStatus}
            isValidEmail={isValidEmail(email)}
            onCheckWaitlist={checkWaitlistStatus}
            onWaitlistRedirect={handleWaitlistRedirect}
          />
          {error && <OnboardingText>{error}</OnboardingText>}
          {successMessage && <OnboardingText>{successMessage}</OnboardingText>}
        </OnboardingForm>
      </div>
    </OnboardingCardLayout>
  );
};
