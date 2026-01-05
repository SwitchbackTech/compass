import { useCallback, useEffect, useState } from "react";
import {
  getOnboardingProgress,
  updateOnboardingProgress,
} from "@web/views/Onboarding/utils/onboarding.storage.util";

export const useIsSignupComplete = () => {
  const [isSignupComplete, setIsSignupComplete] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    const checkSignupStatus = () => {
      const { isSignupComplete: storedValue } = getOnboardingProgress();
      setIsSignupComplete(storedValue);
    };

    checkSignupStatus();
  }, []);

  const markSignupCompleted = useCallback(() => {
    updateOnboardingProgress({ isSignupComplete: true });
    setIsSignupComplete(true);
  }, [setIsSignupComplete]);

  return {
    isSignupComplete,
    markSignupCompleted,
  };
};
