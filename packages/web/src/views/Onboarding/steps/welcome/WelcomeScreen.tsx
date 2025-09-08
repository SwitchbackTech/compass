import React from "react";
import styled from "styled-components";
import {
  OnboardingFooter,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";
import { useOnboarding } from "../../components/OnboardingContext";

const AsciiContainer = styled.div`
  width: 100%;
  overflow: hidden;
  margin: 20px 0;
  position: relative;
`;

const AsciiArt = styled.pre`
  font-family: monospace;
  white-space: pre;
  line-height: 1.2;
  font-size: 18px;
  color: ${({ theme }) => theme.color.common.white};
  text-align: left;
  margin: 0;
  position: relative;
  left: -107px;
`;

export interface WelcomeScreenProps extends OnboardingStepProps {
  firstName: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const { firstName } = useOnboarding();

  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <OnboardingText>Welcome, Captain {firstName}</OnboardingText>
      <AsciiContainer>
        <AsciiArt>
          {`                        |    |    |
                       )_)  )_)  )_)
                      )___))___))___)\\
                     )____)____)_____)\\\\
                   _____|____|____|____\\\\__
          ---------\\                   /---------
            ^^^^^ ^^^^^^^^^^^^^^^^^^^^^
              ^^^^      ^^^^     ^^^    ^^
                   ^^^^      ^^^`}
        </AsciiArt>
      </AsciiContainer>

      <OnboardingFooter
        hideSkip
        onSkip={onSkip}
        onPrev={onPrevious}
        onNext={onNext}
      />
    </OnboardingStepBoilerplate>
  );
};
