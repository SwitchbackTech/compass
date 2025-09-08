import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  OnboardingButton,
  OnboardingCardLayout,
  OnboardingText,
} from "../../components";
import { OnboardingStepProps } from "../../components/Onboarding";

const Title = styled(OnboardingText)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SubmitButton = styled(OnboardingButton)`
  margin-top: ${({ theme }) => theme.spacing.l};
`;

const CRTContainer = styled.div`
  position: relative;
  text-align: left;
  width: 100%;
`;

const AnimatedText = styled(OnboardingText)<{
  delay: number;
  visible: boolean;
}>`
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transition: opacity 0.1s ease-in;
  transition-delay: ${({ delay }) => delay}ms;
`;

const CheckText = styled(OnboardingText)<{ delay: number; visible: boolean }>`
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transition: opacity 0.1s ease-in;
  transition-delay: ${({ delay }) => delay}ms;
  display: inline;
`;

const ResultText = styled(OnboardingText)<{ delay: number; visible: boolean }>`
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transition: opacity 0.1s ease-in;
  transition-delay: ${({ delay }) => delay}ms;
  display: inline;
  margin: 0;
`;

const BlinkingText = styled(OnboardingText)<{
  delay: number;
  visible: boolean;
}>`
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transition: opacity 0.1s ease-in;
  transition-delay: ${({ delay }) => delay}ms;

  @keyframes blink {
    0%,
    50% {
      opacity: 1;
    }
    51%,
    100% {
      opacity: 0;
    }
  }

  animation: ${({ visible }) => (visible ? "blink 1s infinite" : "none")};
`;

export const WelcomeStep: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
}) => {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [checkResults, setCheckResults] = useState<Record<string, boolean>>({});
  const [animationComplete, setAnimationComplete] = useState<boolean>(false);
  const [animationSkipped, setAnimationSkipped] = useState<boolean>(false);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour12: false,
    timeZoneName: "short",
  });

  const textLines = [
    "COMPASS CALENDAR",
    "The weekly planner for minimalists",
    "Copyright (c) 2025. All Rights Reserved",
    "BIOS Version: 20250721",
    "2514 KB",
    dateStr,
    timeStr,
  ];

  const checkLines = [
    { text: "Night Vision Check", result: "98% Lanterns Lit" },
    { text: "Staff Emergency Contacts", result: "Secured in Cabin" },
    { text: "Initializing Compass Alignment", result: "Done" },
    { text: "Provisions Check", result: "Sufficient" },
    { text: "Rigging Integrity Scan", result: "All Lines Taut" },
    { text: "Chart Room Calibration", result: "Complete" },
    { text: "Crew Roster Verification", result: "One Missing" },
    { text: "Wind Vectors Computed", result: "Favorable" },
    { text: "Final Anchor Check", result: "Ready to Hoist" },
    { text: "Sails Unfurled", result: "Awaiting Orders" },
  ];

  const finalLines = ["Press Any Key to board"];

  useEffect(() => {
    if (animationSkipped) return;

    const totalTextLines = textLines.length;
    const totalCheckLines = checkLines.length;
    const totalFinalLines = finalLines.length;
    const totalLines = totalTextLines + totalCheckLines + totalFinalLines;

    let currentLine = 0;
    let timeoutId: NodeJS.Timeout;

    const showNextLine = () => {
      if (animationSkipped) return;

      if (currentLine < totalTextLines) {
        setVisibleLines(currentLine + 1);
        currentLine++;
        timeoutId = setTimeout(showNextLine, 800);
      } else if (currentLine < totalTextLines + totalCheckLines) {
        const checkIndex = currentLine - totalTextLines;
        const checkKey = checkLines[checkIndex].text;

        // First show the check text
        setVisibleLines(currentLine + 1);

        // Then show the result after a shorter delay
        setTimeout(() => {
          if (!animationSkipped) {
            setCheckResults((prev) => ({ ...prev, [checkKey]: true }));
          }
        }, 300);

        currentLine++;
        timeoutId = setTimeout(showNextLine, 800);
      } else if (currentLine < totalLines) {
        setVisibleLines(
          totalTextLines +
            totalCheckLines +
            (currentLine - totalTextLines - totalCheckLines) +
            1,
        );
        currentLine++;
        timeoutId = setTimeout(showNextLine, 600);
      } else {
        setAnimationComplete(true);
      }
    };

    const initialDelay = setTimeout(showNextLine, 400);

    return () => {
      clearTimeout(initialDelay);
      clearTimeout(timeoutId);
    };
  }, [animationSkipped]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      if (!animationComplete) {
        // Skip animation - show all content immediately and stop timeouts
        setAnimationSkipped(true);
        setVisibleLines(
          textLines.length + checkLines.length + finalLines.length,
        );
        const allCheckResults: Record<string, boolean> = {};
        checkLines.forEach((check) => {
          allCheckResults[check.text] = true;
        });
        setCheckResults(allCheckResults);
        setAnimationComplete(true);
      } else {
        // Animation is complete, move to next step
        onNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    animationComplete,
    onNext,
    textLines.length,
    checkLines,
    finalLines.length,
  ]);

  return (
    <OnboardingCardLayout currentStep={currentStep} totalSteps={totalSteps}>
      <CRTContainer>
        {textLines.map((line, index) => (
          <AnimatedText key={index} delay={0} visible={index < visibleLines}>
            {line}
          </AnimatedText>
        ))}

        {checkLines.map((check, index) => {
          const checkVisible = index < visibleLines - textLines.length;
          const resultVisible = checkResults[check.text] || false;

          return (
            <div key={check.text}>
              {checkVisible && (
                <CheckText delay={0} visible={true}>
                  {check.text} ...
                  {resultVisible && (
                    <ResultText delay={0} visible={true}>
                      {check.result}
                    </ResultText>
                  )}
                </CheckText>
              )}
            </div>
          );
        })}

        {finalLines.map((line, index) => (
          <BlinkingText
            key={`final-${index}`}
            delay={0}
            visible={
              index < visibleLines - textLines.length - checkLines.length
            }
          >
            {line}
          </BlinkingText>
        ))}
      </CRTContainer>
    </OnboardingCardLayout>
  );
};
