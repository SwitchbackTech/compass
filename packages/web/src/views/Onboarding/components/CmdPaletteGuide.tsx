import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
import {
  ONBOARDING_GUIDE_VIEWS,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_CONFIGS,
  OnboardingStepName,
} from "../constants/onboarding.constants";
import { useCmdPaletteGuide } from "../hooks/useCmdPaletteGuide";
import { useStepDetection } from "../hooks/useStepDetection";
import { OnboardingInstructionPart } from "../types/onboarding.guide.types";
import { isStepCompleted } from "../utils/onboarding.storage.util";
import {
  getGuideViewFromPathname,
  getGuideWelcomeMessage,
} from "../utils/onboarding.util";

export const CmdPaletteGuide: FC = () => {
  const location = useLocation();
  const { currentStep, completeStep, skipGuide, isGuideActive } =
    useCmdPaletteGuide();
  const step2CompletionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSuccessMessageDismissed, setIsSuccessMessageDismissed] =
    useState(false);

  // Stable callback to prevent effect re-runs that reset task count tracking
  const handleStepComplete = useCallback(
    (step: OnboardingStepName) => {
      // Delay step 2 completion to show instructions on Now view first
      if (step === ONBOARDING_STEPS.NAVIGATE_TO_NOW) {
        if (step2CompletionTimeoutRef.current) {
          clearTimeout(step2CompletionTimeoutRef.current);
        }
        step2CompletionTimeoutRef.current = setTimeout(() => {
          completeStep(step);
        }, 1000);
      } else {
        completeStep(step);
      }
    },
    [completeStep],
  );

  // Unified step detection hook - handles all detection types
  useStepDetection({
    currentStep,
    onStepComplete: handleStepComplete,
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (step2CompletionTimeoutRef.current) {
        clearTimeout(step2CompletionTimeoutRef.current);
      }
    };
  }, []);

  const currentView = getGuideViewFromPathname(location.pathname);
  const viewConfig = ONBOARDING_GUIDE_VIEWS.find(
    (config) => config.id === currentView,
  );
  const overlayVariant = viewConfig?.overlayVariant ?? "centered";

  // Determine actual step based on completion status
  // If on step 2 but step 1 wasn't completed, show step 1 instead
  const actualStep = useMemo(() => {
    if (currentStep === null) return null;
    const firstIncomplete = ONBOARDING_STEP_CONFIGS.find(
      (config) => !isStepCompleted(config.id),
    );
    return firstIncomplete?.id ?? currentStep;
  }, [currentStep]);

  const welcomeMessage = React.useMemo(
    () => getGuideWelcomeMessage(currentView),
    [currentView],
  );

  // Check if navigateToWeek step is completed (show success message on any view)
  // But only if the success message hasn't been dismissed
  const showSuccessMessage =
    isStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_WEEK) &&
    !isSuccessMessageDismissed;

  if (!isGuideActive && !showSuccessMessage) {
    return null;
  }

  const actualStepConfig = actualStep
    ? ONBOARDING_STEP_CONFIGS.find((config) => config.id === actualStep)
    : null;

  const modifierKey = getModifierKey();
  const modifierKeyDisplay = modifierKey === "Meta" ? "⌘" : "Ctrl";

  const instructionParts =
    actualStepConfig?.guide.instructionsByView[currentView] ??
    actualStepConfig?.guide.instructionsByView.default ??
    [];

  // Success message for when user completes navigateToWeek and returns to day view
  const successMessage = (
    <>
      You're all set! You can type{" "}
      <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
        {modifierKeyDisplay} + K
      </kbd>{" "}
      anywhere to open the command palette.
    </>
  );

  const instruction =
    actualStep !== null ? (
      <>
        {instructionParts.map((part: OnboardingInstructionPart, index) =>
          part.type === "kbd" ? (
            <kbd
              key={`${part.value}-${index}`}
              className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs"
            >
              {part.value}
            </kbd>
          ) : (
            <span key={`${part.value}-${index}`}>{part.value}</span>
          ),
        )}
      </>
    ) : null;

  // Determine overlay content and positioning
  const isNowViewOverlay = overlayVariant === "pinned" && !showSuccessMessage;
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
