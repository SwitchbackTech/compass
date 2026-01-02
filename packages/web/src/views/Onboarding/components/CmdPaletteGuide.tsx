import React from "react";
import { useCmdPaletteGuide } from "../hooks/useCmdPaletteGuide";
import { useStep1Detection } from "../hooks/useStep1Detection";
import { useStep2Detection } from "../hooks/useStep2Detection";
import { useStep3Detection } from "../hooks/useStep3Detection";

interface CmdPaletteGuideProps {
  showOnDayView?: boolean;
  showOnNowView?: boolean;
}

export const CmdPaletteGuide: React.FC<CmdPaletteGuideProps> = ({
  showOnDayView = false,
  showOnNowView = false,
}) => {
  const { currentStep, isGuideActive, completeStep, skipGuide } =
    useCmdPaletteGuide();

  // Step detection hooks - always call them, they check currentStep internally
  useStep1Detection({
    currentStep,
    onStepComplete: () => completeStep(1),
  });

  useStep2Detection({
    currentStep,
    onStepComplete: () => completeStep(2),
  });

  useStep3Detection({
    currentStep,
    onStepComplete: () => completeStep(3),
  });

  // Don't render if guide is not active
  if (!isGuideActive || !currentStep) {
    return null;
  }

  // Step 1 should only show on Day view
  if (currentStep === 1 && !showOnDayView) {
    return null;
  }

  // Steps 2 and 3 should only show on Now view
  if ((currentStep === 2 || currentStep === 3) && !showOnNowView) {
    return null;
  }

  const stepInstructions = {
    1: "Press 'c' to create a task",
    2: "Press '1' to go to the /now view",
    3: "Click the description area or press 'd' to customize your note-to-self",
  };

  const instruction =
    stepInstructions[currentStep as keyof typeof stepInstructions];

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
              Command Palette Guide
            </h3>
            <p className="text-text-light mb-3 text-sm">{instruction}</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-2 w-2 rounded-full ${
                    step < currentStep
                      ? "bg-accent-primary"
                      : step === currentStep
                        ? "bg-accent-primary opacity-50"
                        : "bg-border-primary"
                  }`}
                />
              ))}
              <span className="text-text-lighter ml-2 text-xs">
                Step {currentStep} of 3
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
};
