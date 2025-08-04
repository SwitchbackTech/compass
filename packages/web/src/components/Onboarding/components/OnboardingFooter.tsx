// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
import {
  OnboardingButton,
  OnboardingNextButton,
  OnboardingPreviousButton,
} from "../components";

export const OnboardingFooter = ({
  onSkip,
  onPrev,
  onNext,
  hideSkip,
  nextBtnDisabled,
}: {
  onSkip: () => void;
  onPrev: () => void;
  onNext: () => void;
  hideSkip?: boolean;
  nextBtnDisabled?: boolean;
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
        <OnboardingPreviousButton onClick={onPrev} />
        <OnboardingNextButton onClick={onNext} disabled={nextBtnDisabled} />
      </div>
    </div>
  );
};
