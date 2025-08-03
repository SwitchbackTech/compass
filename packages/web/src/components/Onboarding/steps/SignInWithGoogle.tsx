import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthApi } from "@web/common/apis/auth.api";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { GoogleButton } from "@web/components/oauth/google/GoogleButton";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { OnboardingStepBoilerplate } from "../components";
import { OnboardingStepProps } from "../components/Onboarding";

export const SignInWithGoogle: React.FC<OnboardingStepProps> = ({
  currentStep,
  totalSteps,
  onNext,
  // onPrevious,
}) => {
  const navigate = useNavigate();

  const { login, loading } = useGoogleLogin({
    onSuccess: async (code) => {
      const result = await AuthApi.loginOrSignup(code);
      if (!result.isNewUser) {
        navigate("/");
      }
      onNext();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return (
    <OnboardingStepBoilerplate
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <GoogleButton
        disabled={loading}
        onClick={login}
        style={{
          marginTop: "120px",
          marginBottom: "60px",
        }}
      />
      {loading && <AbsoluteOverflowLoader />}
    </OnboardingStepBoilerplate>
  );
};
