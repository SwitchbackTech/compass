import React from "react";
import { OnboardingButton } from "../../../components";
import { NextAction } from "../../../util/waitlist.check";
import { SubmitButton } from "./styled";

interface WaitlistButtonProps {
  nextAction: NextAction;
  isLoading: boolean;
  isValidEmail: boolean;
  onCheckWaitlist: () => void;
  onWaitlistRedirect: () => void;
}

export const WaitlistButton: React.FC<WaitlistButtonProps> = ({
  nextAction,
  isLoading,
  isValidEmail,
  onCheckWaitlist,
  onWaitlistRedirect,
}) => {
  const getButtonText = () => {
    if (isLoading) return "Checking...";
    switch (nextAction) {
      case "NOTHING":
        return "BYPASS WAITLIST";
      case "SHOW_WAITLIST_BTN":
        return "Signup For Waitlist";
      case "NEXT_BTN":
        return "Continue";
      default:
        return "Continue";
    }
  };

  const getButtonProps = () => {
    const baseProps = {
      type: "button" as const,
      style: { marginTop: "1rem" },
    };

    switch (nextAction) {
      case "NOTHING":
        return {
          ...baseProps,
          onClick: onCheckWaitlist,
        };
      case "SHOW_WAITLIST_BTN":
        return {
          ...baseProps,
          onClick: onWaitlistRedirect,
        };
      case "NEXT_BTN":
        return {
          ...baseProps,
          onClick: onCheckWaitlist,
          disabled: isLoading || !isValidEmail,
        };
      default:
        return baseProps;
    }
  };

  if (nextAction === "NEXT_BTN") {
    return <SubmitButton {...getButtonProps()}>{getButtonText()}</SubmitButton>;
  }

  return (
    <OnboardingButton {...getButtonProps()}>{getButtonText()}</OnboardingButton>
  );
};
