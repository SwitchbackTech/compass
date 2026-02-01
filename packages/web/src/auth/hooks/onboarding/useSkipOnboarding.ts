import { useCallback, useEffect, useState } from "react";
import {
  getOnboardingProgress,
  updateOnboardingProgress,
} from "@web/views/Onboarding/utils/onboarding.storage.util";

export const useSkipOnboarding = () => {
  const [skipOnboarding, setSkipOnboarding] = useState<boolean>(false);

  useEffect(() => {
    const checkOnboardingStatus = () => {
      const { isOnboardingSkipped: storedValue } = getOnboardingProgress();
      setSkipOnboarding(storedValue);
    };

    checkOnboardingStatus();
  }, []);

  const updateOnboardingStatus = useCallback(
    (skip: boolean) => {
      updateOnboardingProgress({ isOnboardingSkipped: skip });

      setSkipOnboarding(skip);
    },
    [setSkipOnboarding],
  );

  return {
    skipOnboarding,
    updateOnboardingStatus,
  };
};
