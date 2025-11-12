import React from "react";
import { useGoogleAuth } from "@web/common/hooks/useGoogleAuth";
import { useSession } from "@web/common/hooks/useSession";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { GoogleButton } from "@web/components/oauth/google/GoogleButton";
import { OnboardingStepProps } from "@web/views/Onboarding/components/Onboarding";
import { OnboardingCardLayout } from "@web/views/Onboarding/components/layouts/OnboardingCardLayout";

export const MobileSignIn: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const session = useSession();
  const googleAuth = useGoogleAuth({ onNext });
  const isAlreadyAuthenticated = !session.loading && session.authenticated;

  return (
    <OnboardingCardLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      hideSkip
      onSkip={onSkip}
      onPrevious={onPrevious}
      onNext={onNext}
      nextBtnDisabled
      prevBtnDisabled
      showFooter={false}
    >
      <GoogleButton
        disabled={googleAuth.loading || isAlreadyAuthenticated}
        onClick={googleAuth.login}
        style={{
          marginTop: "60px",
          marginBottom: "60px",
        }}
      />
      {googleAuth.loading || isAlreadyAuthenticated ? (
        <AbsoluteOverflowLoader />
      ) : null}
    </OnboardingCardLayout>
  );
};
