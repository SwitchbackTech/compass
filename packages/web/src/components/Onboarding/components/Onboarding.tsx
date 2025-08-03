import React, { useState } from "react";
import styled from "styled-components";

export const OnboardingRoot = styled.div`
  // background: rgba(0, 0, 0, 0.8);
  position: relative;
  height: 100vh;
  width: 100vw;
`;

export const OnboardingContainer = styled.div`
  background-color: #12151b;
  position: absolute;
  width: 900px;
  height: 800px;
  border-radius: 44px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: rgb(255 255 255 / 15%) 0px 9px 20px 1px;
`;

export interface OnboardingStepProps {
  currentStep: number;
  totalSteps: number;
  onNext: (data?: Record<string, unknown>) => void;
  onPrevious: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

export interface OnboardingStep {
  id: string;
  component: React.ComponentType<OnboardingStepProps>;
  onNext?: (data?: Record<string, unknown>) => void;
}

interface Props {
  steps: OnboardingStep[];
  onComplete: (reason: "skip" | "complete") => void;
  className?: string;
}

export const Onboarding: React.FC<Props> = ({
  steps,
  onComplete,
  className,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const handleNext = (data?: Record<string, unknown>) => {
    // Call `onNext` if provided
    steps[currentStepIndex].onNext?.(data);

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete("complete");
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = () => {
    onComplete("complete");
  };

  const handleSkip = () => {
    onComplete("skip");
  };

  const currentStep = steps[currentStepIndex];
  const StepComponent = currentStep?.component;

  if (!StepComponent) {
    return null;
  }

  const stepProps: OnboardingStepProps = {
    currentStep: currentStepIndex + 1,
    totalSteps: steps.length,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onComplete: handleComplete,
    onSkip: handleSkip,
  };

  return (
    <OnboardingRoot>
      <OnboardingContainer className={className} id="onboarding-container">
        <StepComponent {...stepProps} />
      </OnboardingContainer>
    </OnboardingRoot>
  );
};
