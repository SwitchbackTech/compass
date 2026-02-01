import { FC } from "react";
import {
  ONBOARDING_STEP_CONFIGS,
  OnboardingStepName,
} from "../constants/onboarding.constants";
import { isStepCompleted } from "../utils/onboarding.storage.util";

interface GuideProgressIndicatorProps {
  actualStep: OnboardingStepName | null;
  showSuccessMessage: boolean;
  stepText?: string;
}

export const GuideProgressIndicator: FC<GuideProgressIndicatorProps> = ({
  actualStep,
  showSuccessMessage,
  stepText,
}) => {
  if (!stepText) {
    return null;
  }

  const actualStepIndex = actualStep
    ? (ONBOARDING_STEP_CONFIGS.find((config) => config.id === actualStep)
        ?.order ?? -1)
    : -1;

  return (
    <div className="flex items-center gap-2">
      {ONBOARDING_STEP_CONFIGS.map((stepConfig) => {
        const stepIndex = stepConfig.order;
        const isCompleted =
          showSuccessMessage ||
          stepIndex < actualStepIndex ||
          isStepCompleted(stepConfig.id);
        const isCurrent = !showSuccessMessage && stepConfig.id === actualStep;

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
  );
};
