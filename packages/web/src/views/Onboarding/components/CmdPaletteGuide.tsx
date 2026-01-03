import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useSession } from "@web/common/hooks/useSession";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_CONFIGS,
} from "../constants/onboarding.constants";
import { useCmdPaletteGuide } from "../hooks/useCmdPaletteGuide";
import { useStepDetection } from "../hooks/useStepDetection";
import { isStepCompleted } from "../utils/onboarding.storage.util";

export const CmdPaletteGuide: React.FC = () => {
  const location = useLocation();
  const { authenticated } = useSession();
  const { currentStep, isGuideActive, completeStep, skipGuide } =
    useCmdPaletteGuide();
  const step2CompletionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSuccessMessageDismissed, setIsSuccessMessageDismissed] =
    React.useState(false);

  // Unified step detection hook - handles all detection types
  useStepDetection({
    currentStep,
    onStepComplete: (step) => {
      // Delay step 2 completion to show instructions on Now view first
      if (step === ONBOARDING_STEPS.NAVIGATE_TO_NOW) {
        if (step2CompletionTimeoutRef.current) {
          clearTimeout(step2CompletionTimeoutRef.current);
        }
        step2CompletionTimeoutRef.current = setTimeout(() => {
          completeStep(step);
        }, 1500); // Show step 2 instructions for 1.5 seconds
      } else {
        completeStep(step);
      }
    },
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (step2CompletionTimeoutRef.current) {
        clearTimeout(step2CompletionTimeoutRef.current);
      }
    };
  }, []);

  // Detect current view (only needed for welcome message and overlay positioning)
  const isDayView =
    location.pathname === ROOT_ROUTES.DAY ||
    location.pathname.startsWith(`${ROOT_ROUTES.DAY}/`);
  const isNowView =
    location.pathname === ROOT_ROUTES.NOW ||
    location.pathname.startsWith(`${ROOT_ROUTES.NOW}/`);

  // Determine actual step based on completion status
  // If on step 2 but step 1 wasn't completed, show step 1 instead
  const actualStep = React.useMemo(() => {
    if (currentStep === null) return null;
    // If we're on step 2 but step 1 wasn't completed, stay on step 1
    if (
      currentStep === ONBOARDING_STEPS.NAVIGATE_TO_NOW &&
      !isStepCompleted(ONBOARDING_STEPS.CREATE_TASK)
    ) {
      return ONBOARDING_STEPS.CREATE_TASK;
    }
    return currentStep;
  }, [currentStep]);

  // Determine contextual welcome message based on current view
  const welcomeMessage = React.useMemo(() => {
    if (isNowView) {
      return "Welcome to the Now View";
    }
    if (isDayView) {
      return "Welcome to the Day View";
    }
    return "Welcome to Compass";
  }, [isDayView, isNowView]);

  // Check if navigateToWeek step is completed (show success message on any view)
  // But only if the success message hasn't been dismissed
  const showSuccessMessage =
    isStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_WEEK) &&
    !isSuccessMessageDismissed;

  // Determine if we should show the overlay
  // Show success message if final step is completed, OR show guide if active with a step
  // But respect view restrictions: step 1 on any view, step 2 on day/now, steps 3/4 only on now, step 5 on any
  const shouldShowOverlay =
    showSuccessMessage ||
    (isGuideActive &&
      actualStep !== null &&
      ((actualStep === ONBOARDING_STEPS.CREATE_TASK && !authenticated) ||
        (actualStep === ONBOARDING_STEPS.NAVIGATE_TO_NOW &&
          ((isDayView && !authenticated) || isNowView)) ||
        (actualStep === ONBOARDING_STEPS.EDIT_DESCRIPTION && isNowView) ||
        (actualStep === ONBOARDING_STEPS.EDIT_REMINDER && isNowView) ||
        actualStep === ONBOARDING_STEPS.NAVIGATE_TO_WEEK));

  if (!shouldShowOverlay) {
    return null;
  }

  const modifierKey = getModifierKey();
  const modifierKeyDisplay = modifierKey === "Meta" ? "⌘" : "Ctrl";

  // Step instructions with JSX for keyboard shortcuts
  const stepInstructions = {
    [ONBOARDING_STEPS.CREATE_TASK]: (
      <>
        Type{" "}
        <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
          c
        </kbd>{" "}
        to create a task
      </>
    ),
    [ONBOARDING_STEPS.NAVIGATE_TO_NOW]: (
      <>
        Press{" "}
        <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
          1
        </kbd>{" "}
        to go to the /now view
      </>
    ),
    [ONBOARDING_STEPS.EDIT_DESCRIPTION]: (
      <>
        Press{" "}
        <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
          d
        </kbd>{" "}
        to edit the description
      </>
    ),
    [ONBOARDING_STEPS.EDIT_REMINDER]: (
      <>
        Press{" "}
        <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
          r
        </kbd>{" "}
        to edit the reminder
      </>
    ),
    [ONBOARDING_STEPS.NAVIGATE_TO_WEEK]: (
      <>
        Type{" "}
        <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
          3
        </kbd>{" "}
        to go to the week view
      </>
    ),
  };

  // Success message for when user completes navigateToWeek and returns to day view
  const successMessage = (
    <>
      Great job! You can type{" "}
      <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
        {modifierKeyDisplay} + K
      </kbd>{" "}
      anywhere to open the command palette. Ready to get started?
    </>
  );

  const instruction =
    actualStep !== null
      ? stepInstructions[actualStep as keyof typeof stepInstructions]
      : null;

  // Determine overlay content and positioning
  const isNowViewOverlay = isNowView && !showSuccessMessage;
  const displayTitle = showSuccessMessage
    ? "Welcome to Compass"
    : welcomeMessage;
  const displayContent = showSuccessMessage ? successMessage : instruction;
  const stepNumber = showSuccessMessage
    ? null
    : actualStep
      ? (ONBOARDING_STEP_CONFIGS.find((config) => config.id === actualStep)
          ?.order ?? -1) + 1
      : 0;
  const stepText = showSuccessMessage
    ? "All steps completed"
    : `Step ${stepNumber} of ${ONBOARDING_STEP_CONFIGS.length}`;

  // Single unified overlay component
  const overlayContent = (
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
              {displayContent}
            </p>
            <div className="flex items-center gap-2">
              {ONBOARDING_STEP_CONFIGS.map((stepConfig) => {
                const stepIndex = stepConfig.order;
                const actualStepIndex = actualStep
                  ? (ONBOARDING_STEP_CONFIGS.find(
                      (config) => config.id === actualStep,
                    )?.order ?? -1)
                  : -1;
                const isCompleted =
                  showSuccessMessage ||
                  stepIndex < actualStepIndex ||
                  isStepCompleted(stepConfig.id);
                const isCurrent =
                  !showSuccessMessage && stepConfig.id === actualStep;
                return (
                  <div
                    key={stepConfig.id}
                    className={`h-2 w-2 rounded-full ${
                      isCompleted
                        ? "bg-accent-primary"
                        : isCurrent
                          ? "bg-accent-primary opacity-50"
                          : "bg-border-primary"
                    }`}
                  />
                );
              })}
              <span className="text-text-lighter ml-2 text-xs">{stepText}</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (showSuccessMessage) {
                setIsSuccessMessageDismissed(true);
                skipGuide();
              } else {
                skipGuide();
              }
            }}
            className={`flex-shrink-0 transition-colors ${
              isNowViewOverlay
                ? "text-text-lighter hover:text-text-light ml-4 text-sm font-medium"
                : "text-text-light/60 hover:text-text-light"
            }`}
            aria-label={showSuccessMessage ? "Dismiss" : "Skip guide"}
          >
            {isNowViewOverlay ? (
              "Skip"
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return overlayContent;
};
