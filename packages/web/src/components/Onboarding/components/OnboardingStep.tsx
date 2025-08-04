import React, { ReactNode } from "react";
import {
  OnboardingContent,
  ProgressDot,
  ProgressIndicator,
  useOnboarding,
} from ".";

interface Props {
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  style?: React.CSSProperties;
}

export const OnboardingStep: React.FC<Props> = ({
  currentStep,
  totalSteps,
  children,
  style,
}) => {
  const { hideSteps } = useOnboarding();

  return (
    <div
      id="onboarding-step"
      style={{
        width: "100%",
        overflow: "auto",
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
      <OnboardingContent>{children}</OnboardingContent>
    </div>
  );
};
