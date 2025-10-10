import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthApi } from "@web/common/apis/auth.api";
import { SyncApi } from "@web/common/apis/sync.api";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { GoogleButton } from "@web/components/oauth/google/GoogleButton";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { OnboardingStepProps } from "../../components/Onboarding";
import { OnboardingCardLayout } from "../../components/layouts/OnboardingCardLayout";

export const MobileSignIn: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const navigate = useNavigate();

  const { login, loading } = useGoogleLogin({
    onSuccess: async (code) => {
      const result = await AuthApi.loginOrSignup(code);
      if (result.isNewUser) {
        // Start Google Calendar import in the background
        // This allows the import to begin while the user continues through onboarding
        SyncApi.importGCal().catch((error) => {
          // Log the error but don't block the onboarding flow
          console.error("Background Google Calendar import failed:", error);
        });
      } else {
        navigate("/");
      }
      onNext();
    },
    onError: (error) => {
      console.error(error);
    },
  });

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
        disabled={loading}
        onClick={login}
        style={{
          marginTop: "60px",
          marginBottom: "60px",
        }}
      />
      {loading && <AbsoluteOverflowLoader />}
    </OnboardingCardLayout>
  );
};
