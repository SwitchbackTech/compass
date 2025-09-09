// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
import {
  OnboardingButton,
  OnboardingNextButton,
  OnboardingPreviousButton,
} from ".";

export const OnboardingFooter = ({
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
    <div
      id="onboarding-footer"
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        {!hideSkip && (
          <OnboardingButton onClick={onSkip}>Skip Intro</OnboardingButton>
        )}
      </div>
      <div style={{ display: "flex", gap: "16px" }}>
        <OnboardingPreviousButton onClick={onPrev} disabled={prevBtnDisabled} />
        <OnboardingNextButton onClick={onNext} disabled={nextBtnDisabled} />
      </div>
    </div>
  );
};
