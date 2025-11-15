import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

export const useSkipOnboarding = () => {
  const [skipOnboarding, setSkipOnboarding] = useState<boolean>(false);

  useEffect(() => {
    const checkOnboardingStatus = () => {
      const storedValue = localStorage.getItem(STORAGE_KEYS.SKIP_ONBOARDING);

      setSkipOnboarding(storedValue === "true");
    };

    checkOnboardingStatus();
  }, []);

  const updateOnboardingStatus = useCallback(
    (skip: boolean) => {
      localStorage.setItem(
        STORAGE_KEYS.SKIP_ONBOARDING,
        skip ? "true" : "false",
      );

      setSkipOnboarding(skip);
    },
    [setSkipOnboarding],
  );

  return {
    skipOnboarding,
    updateOnboardingStatus,
  };
};
