import React from "react";
import {
  OnboardingFooter,
  OnboardingStepBoilerplate,
  OnboardingText,
} from "../components";
import { OnboardingStepProps } from "../components/Onboarding";
import { useOnboarding } from "../components/OnboardingContext";

// const AsciiArt = styled.pre`
//   font-family: monospace;
//   white-space: pre;
//   line-height: 1.2;
//   font-size: 12px;
//   color: ${({ theme }) => theme.color.common.white};
//   margin: 20px 0;
//   text-align: center;
// `;

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
      {/* <AsciiArt>
          {`
        

                        |    |    |
                       )_)  )_)  )_)
                      )___))___))___)${`\\`}
                     )____)____)_____)${`\\`}${"\\"}
                   _____|____|____|____${`\\`}\\__
          ---------${`\\`}                   /---------
            ^^^^^ ^^^^^^^^^^^^^^^^^^^^^
              ^^^^      ^^^^     ^^^    ^^
                   ^^^^      ^^^

                   
                   
        `}
        </AsciiArt> */}

      <OnboardingFooter
        hideSkip
        onSkip={onSkip}
        onPrev={onPrevious}
        onNext={onNext}
      />
    </OnboardingStepBoilerplate>
  );
};
