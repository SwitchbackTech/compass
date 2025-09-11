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
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Skip button positioned absolutely on the left */}
      {!hideSkip && (
        <div
          style={{
            position: "absolute",
            left: 0,
          }}
        >
          <OnboardingButton aria-label="Skip" onClick={onSkip}>
            Skip Intro
          </OnboardingButton>
        </div>
      )}

      {/* Navigation buttons in the center */}
      <div style={{ display: "flex", gap: "16px" }}>
        <OnboardingPreviousButton
          aria-label="Previous"
          onClick={onPrev}
          disabled={prevBtnDisabled}
        />
        <OnboardingNextButton
          aria-label="Next"
          onClick={onNext}
          disabled={nextBtnDisabled}
        />
      </div>
    </div>
  );
};
