import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useOnboardingShortcuts } from "../hooks/useOnboardingShortcuts";

export const OnboardingRoot = styled.div`
  // background: rgba(0, 0, 0, 0.8);
  position: relative;
  height: 100vh;
  width: 100vw;
`;

interface OnboardingContainerProps {
  fullWidth?: boolean;
}

export const OnboardingContainer = styled.div<OnboardingContainerProps>`
  background-color: #12151b;
  position: absolute;
  width: ${({ fullWidth }) => (fullWidth ? "100vw" : "900px")};
  height: ${({ fullWidth }) => (fullWidth ? "100vh" : "800px")};
  border-radius: ${({ fullWidth }) => (fullWidth ? "0" : "44px")};
  top: ${({ fullWidth }) => (fullWidth ? "0" : "50%")};
  left: ${({ fullWidth }) => (fullWidth ? "0" : "50%")};
  transform: ${({ fullWidth }) =>
    fullWidth ? "none" : "translate(-50%, -50%)"};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ fullWidth }) =>
    fullWidth ? "none" : "rgb(255 255 255 / 15%) 0px 9px 20px 1px"};

  @keyframes flicker {
    0%,
    100% {
      opacity: 1;
    }
    2% {
      opacity: 0.8;
    }
    4% {
      opacity: 1;
    }
    8% {
      opacity: 0.9;
    }
    10% {
      opacity: 1;
    }
    12% {
      opacity: 0.95;
    }
    14% {
      opacity: 1;
    }
    16% {
      opacity: 0.85;
    }
    18% {
      opacity: 1;
    }
    20% {
      opacity: 0.9;
    }
    22% {
      opacity: 1;
    }
  }

  animation: ${({ fullWidth }) =>
    fullWidth ? "none" : "flicker 0.5s infinite"};

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(transparent 50%, rgba(0, 255, 0, 0.03) 50%);
    background-size: 100% 4px;
    pointer-events: none;
    z-index: 1;
    border-radius: ${({ fullWidth }) => (fullWidth ? "0" : "44px")};
  }
`;

export interface OnboardingStepProps {
  currentStep: number;
  totalSteps: number;
  onNext: (data?: Record<string, unknown>) => void;
  onPrevious: () => void;
  onComplete: () => void;
  onSkip: () => void;
  // New props for keyboard control
  canNavigateNext?: boolean;
  nextButtonDisabled?: boolean;
  onNavigationControlChange?: (shouldPrevent: boolean) => void;
  isNavPrevented?: boolean;
}

export interface OnboardingStep {
  id: string;
  component: React.ComponentType<OnboardingStepProps>;
  onNext?: (data?: Record<string, unknown>) => void;
  disableLeftArrow?: boolean;
  disableRightArrow?: boolean;
  // Navigation control properties
  preventNavigation?: boolean;
  nextButtonDisabled?: boolean;
  canNavigateNext?: boolean;
}

interface Props {
  steps: OnboardingStep[];
  onComplete: (reason: "skip" | "complete") => void;
  className?: string;
  fullWidth?: boolean;
}

export const Onboarding: React.FC<Props> = ({
  steps,
  onComplete,
  className,
  fullWidth = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNavPrevented, setIsNavPrevented] = useState(false);

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

  // Get navigation control from step configuration
  const preventNavigation = currentStep.preventNavigation || false;
  const nextButtonDisabled = currentStep.nextButtonDisabled || false;
  const canNavigateNext = currentStep.canNavigateNext !== false; // Default to true

  // Use the keyboard shortcuts hook
  useOnboardingShortcuts({
    onNext: handleNext,
    onPrevious: handlePrevious,
    canNavigateNext,
    nextButtonDisabled,
    shouldPreventNavigation: isNavPrevented || preventNavigation,
  });

  // Handle navigation control changes from steps
  const handleNavigationControlChange = (shouldPrevent: boolean) => {
    setIsNavPrevented(shouldPrevent);
  };

  const stepProps: OnboardingStepProps = {
    currentStep: currentStepIndex + 1,
    totalSteps: steps.length,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onComplete: handleComplete,
    onSkip: handleSkip,
    canNavigateNext,
    nextButtonDisabled,
    onNavigationControlChange: handleNavigationControlChange,
    isNavPrevented: isNavPrevented || preventNavigation,
  };

  return (
    <OnboardingRoot>
      <StepComponent {...stepProps} />
    </OnboardingRoot>
  );
};
