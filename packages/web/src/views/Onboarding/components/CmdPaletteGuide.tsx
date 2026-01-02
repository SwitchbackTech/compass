import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useSession } from "@web/common/hooks/useSession";
import { useCmdPaletteGuide } from "../hooks/useCmdPaletteGuide";
import { useStep1Detection } from "../hooks/useStep1Detection";
import { useStep2Detection } from "../hooks/useStep2Detection";
import { useStep3Detection } from "../hooks/useStep3Detection";
import { isStepCompleted } from "../utils/onboardingStorage.util";

export const CmdPaletteGuide: React.FC = () => {
  const location = useLocation();
  const { authenticated } = useSession();
  const { currentStep, isGuideActive, completeStep, skipGuide } =
    useCmdPaletteGuide();
  const step2CompletionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Step detection hooks - always call them, they check currentStep internally
  useStep1Detection({
    currentStep,
    onStepComplete: () => completeStep(1),
  });

  // Delay step 2 completion to show instructions on Now view first
  useStep2Detection({
    currentStep,
    onStepComplete: () => {
      // Add a delay so step 2 instructions show on Now view before moving to step 3
      if (step2CompletionTimeoutRef.current) {
        clearTimeout(step2CompletionTimeoutRef.current);
      }
      step2CompletionTimeoutRef.current = setTimeout(() => {
        completeStep(2);
      }, 1500); // Show step 2 instructions for 1.5 seconds
    },
  });

  useStep3Detection({
    currentStep,
    onStepComplete: () => completeStep(3),
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (step2CompletionTimeoutRef.current) {
        clearTimeout(step2CompletionTimeoutRef.current);
      }
    };
  }, []);

  // Detect current view
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
    if (currentStep === 2 && !isStepCompleted(1)) {
      return 1;
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

  // Determine if we should show the overlay
  // Show step 1 on any view if it's not completed
  // Show step 2/3 on Now view, step 1/2 on Day view
  const shouldShowOverlay =
    isGuideActive &&
    actualStep !== null &&
    ((actualStep === 1 && !authenticated) ||
      (isDayView && actualStep === 2 && !authenticated) ||
      (isNowView && (actualStep === 2 || actualStep === 3)));

  if (!shouldShowOverlay) {
    return null;
  }

  // Step instructions with JSX for keyboard shortcuts
  const stepInstructions = {
    1: (
      <>
        Type{" "}
        <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
          c
        </kbd>{" "}
        to create a task
      </>
    ),
    2: (
      <>
        Press{" "}
        <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
          1
        </kbd>{" "}
        to go to the /now view
      </>
    ),
    3: (
      <>
        Click the description area or press{" "}
        <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
          d
        </kbd>{" "}
        to customize your note-to-self
      </>
    ),
  };

  const instruction =
    stepInstructions[actualStep as keyof typeof stepInstructions];

  // Day view or step 1: centered overlay with progress indicators
  if (
    (isDayView && (actualStep === 1 || actualStep === 2)) ||
    actualStep === 1
  ) {
    return (
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transform">
        <div className="bg-bg-primary border-border-primary mx-4 max-w-md rounded-lg border p-4 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-text-light mb-2 text-lg font-semibold">
                {welcomeMessage}
              </h3>
              <p className="text-text-light/80 mb-3 text-sm">{instruction}</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => {
                  const isCompleted =
                    step < actualStep! || isStepCompleted(step);
                  const isCurrent = step === actualStep;
                  return (
                    <div
                      key={step}
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
                <span className="text-text-lighter ml-2 text-xs">
                  Step {actualStep} of 3
                </span>
              </div>
            </div>
            <button
              onClick={skipGuide}
              className="text-text-light/60 hover:text-text-light flex-shrink-0 transition-colors"
              aria-label="Skip guide"
            >
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
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Now view: right-aligned overlay with step indicators
  if (isNowView && (actualStep === 2 || actualStep === 3)) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{ zIndex: 9999 }}
      >
        <div
          className="bg-bg-primary border-border-primary pointer-events-auto fixed right-6 bottom-6 max-w-sm rounded-lg border p-6 shadow-lg"
          style={{ zIndex: 10000 }}
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-text-light mb-2 text-lg font-semibold">
                {welcomeMessage}
              </h3>
              <p className="text-text-light mb-3 text-sm">{instruction}</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => {
                  const isCompleted =
                    step < actualStep! || isStepCompleted(step);
                  const isCurrent = step === actualStep;
                  return (
                    <div
                      key={step}
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
                <span className="text-text-lighter ml-2 text-xs">
                  Step {actualStep} of 3
                </span>
              </div>
            </div>
            <button
              onClick={skipGuide}
              className="text-text-lighter hover:text-text-light ml-4 text-sm font-medium"
              aria-label="Skip guide"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
