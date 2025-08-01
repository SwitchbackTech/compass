import React, { ReactNode } from "react";
import { OnboardingContent, ProgressDot, ProgressIndicator } from "./styled";

interface Props {
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  className?: string;
}

export const OnboardingStep: React.FC<Props> = ({
  currentStep,
  totalSteps,
  children,
  className,
}) => {
  return (
    <div className={className}>
      <ProgressIndicator>
        {Array.from({ length: totalSteps }, (_, index) => (
          <ProgressDot key={index} isActive={index < currentStep} />
        ))}
      </ProgressIndicator>
      <OnboardingContent>{children}</OnboardingContent>
    </div>
  );
};
