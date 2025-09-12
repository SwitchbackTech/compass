// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
import styled from "styled-components";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  OnboardingButton,
  OnboardingNextButton,
  OnboardingPreviousButton,
} from ".";

const FixedFooterContainer = styled.div`
  position: fixed;
  bottom: 5px;
  left: 20px;
  right: 20px;
  width: calc(100% - 40px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  z-index: 1000;
`;

const SkipButtonContainer = styled.div`
  display: flex;
`;

const NavigationButtonsContainer = styled.div`
  display: flex;
  gap: 16px;
`;

export const FixedOnboardingFooter = ({
  onSkip,
  onPrev,
  onNext,
  hideSkip,
  nextBtnDisabled,
  prevBtnDisabled,
}: {
  onSkip: () => void;
  onPrev: () => void;
  onNext: () => void;
  hideSkip?: boolean;
  nextBtnDisabled?: boolean;
  prevBtnDisabled?: boolean;
}) => {
  return (
    <FixedFooterContainer id="fixed-onboarding-footer">
      {/* Skip button on the left */}
      {!hideSkip ? (
        <SkipButtonContainer>
          <OnboardingButton aria-label="Skip" onClick={onSkip}>
            Skip Intro
          </OnboardingButton>
        </SkipButtonContainer>
      ) : (
        <div /> // Empty div to maintain space when skip is hidden
      )}

      {/* Navigation buttons on the right */}
      <NavigationButtonsContainer>
        <TooltipWrapper
          description="Previous step"
          onClick={onPrev}
          shortcut="J"
        >
          <OnboardingPreviousButton
            aria-label="Previous"
            disabled={prevBtnDisabled}
          />
        </TooltipWrapper>
        <TooltipWrapper description="Next step" onClick={onNext} shortcut="K">
          <OnboardingNextButton aria-label="Next" disabled={nextBtnDisabled} />
        </TooltipWrapper>
      </NavigationButtonsContainer>
    </FixedFooterContainer>
  );
};
