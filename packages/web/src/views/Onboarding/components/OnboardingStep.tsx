import React from "react";
import { ProgressDot, ProgressIndicator, useOnboarding } from ".";

interface Props {
  currentStep: number;
  totalSteps: number;
  style?: React.CSSProperties;
}

export const OnboardingStep: React.FC<Props> = ({
  currentStep,
  totalSteps,
  style,
}) => {
  const { hideSteps } = useOnboarding();

  return (
    <div
      id="onboarding-step"
      style={{
        position: "absolute",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        ...style,
      }}
    >
      {!hideSteps && (
        <ProgressIndicator>
          {Array.from({ length: totalSteps }, (_, index) => (
            <ProgressDot key={index} isActive={index < currentStep} />
          ))}
        </ProgressIndicator>
      )}
    </div>
  );
};
