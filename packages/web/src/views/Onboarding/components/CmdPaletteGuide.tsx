import { FC, useCallback, useState } from "react";
import { OnboardingStepName } from "../constants/onboarding.constants";
import { useCmdPaletteGuide } from "../hooks/useCmdPaletteGuide";
import { useGuideOverlayState } from "../hooks/useGuideOverlayState";
import { useStepDetection } from "../hooks/useStepDetection";
import {
  GuideInstructionContent,
  GuideSuccessMessage,
} from "./GuideInstructionContent";
import { GuideProgressIndicator } from "./GuideProgressIndicator";
import { GuideSkipButton } from "./GuideSkipButton";

export const CmdPaletteGuide: FC = () => {
  const { currentStep, completeStep, skipGuide, isGuideActive } =
    useCmdPaletteGuide();
  const [isSuccessMessageDismissed, setIsSuccessMessageDismissed] =
    useState(false);

  const {
    welcomeMessage,
    showSuccessMessage,
    instructionParts,
    actualStep,
    stepText,
    isNowViewOverlay,
  } = useGuideOverlayState({
    currentStep,
    isSuccessMessageDismissed,
  });

  // Stable callback to prevent effect re-runs that reset task count tracking
  const handleStepComplete = useCallback(
    (step: OnboardingStepName) => {
      completeStep(step);
    },
    [completeStep],
  );

  // Unified step detection hook - handles all detection types
  useStepDetection({
    currentStep,
    onStepComplete: handleStepComplete,
  });

  const handleSkip = useCallback(() => {
    if (showSuccessMessage) {
      setIsSuccessMessageDismissed(true);
    }
    skipGuide();
  }, [showSuccessMessage, skipGuide]);

  if (!isGuideActive && !showSuccessMessage) {
    return null;
  }

  const displayTitle = showSuccessMessage
    ? "Welcome to Compass"
    : welcomeMessage;

  return (
    <div
      className={
        isNowViewOverlay
          ? "pointer-events-none fixed inset-0 z-50"
          : "fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transform"
      }
      style={isNowViewOverlay ? { zIndex: 9999 } : undefined}
    >
      <div
        className={`bg-bg-primary border-border-primary rounded-lg border shadow-lg ${
          isNowViewOverlay
            ? "pointer-events-auto fixed right-6 bottom-6 max-w-sm p-6"
            : "mx-4 max-w-md p-4"
        }`}
        style={isNowViewOverlay ? { zIndex: 10000 } : undefined}
      >
        <div
          className={
            isNowViewOverlay
              ? "mb-4 flex items-start justify-between"
              : "flex items-start justify-between gap-4"
          }
        >
          <div className="flex-1">
            <h3 className="text-text-light mb-2 text-lg font-semibold">
              {displayTitle}
            </h3>
            <p
              className={`mb-3 text-sm ${
                isNowViewOverlay ? "text-text-light" : "text-text-light/80"
              }`}
            >
              {showSuccessMessage ? (
                <GuideSuccessMessage />
              ) : (
                <GuideInstructionContent instructionParts={instructionParts} />
              )}
            </p>
            <GuideProgressIndicator
              actualStep={actualStep}
              showSuccessMessage={showSuccessMessage}
              stepText={stepText}
            />
          </div>
          <GuideSkipButton
            onClick={handleSkip}
            showSuccessMessage={showSuccessMessage}
            isNowViewOverlay={isNowViewOverlay}
          />
        </div>
      </div>
    </div>
  );
};
