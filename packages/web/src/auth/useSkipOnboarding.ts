import { useCallback, useEffect, useState } from "react";
import {
  getAuthStorage,
  updateAuthStorage,
} from "@web/common/utils/storage/auth.storage.util";

export const useSkipOnboarding = () => {
  const [skipOnboarding, setSkipOnboarding] = useState<boolean>(false);

  useEffect(() => {
    const checkOnboardingStatus = () => {
      const { skipOnboarding: storedValue } = getAuthStorage();
      setSkipOnboarding(storedValue);
    };

    checkOnboardingStatus();
  }, []);

  const updateOnboardingStatus = useCallback(
    (skip: boolean) => {
      updateAuthStorage({ skipOnboarding: skip });

      setSkipOnboarding(skip);
    },
    [setSkipOnboarding],
  );

  return {
    skipOnboarding,
    updateOnboardingStatus,
  };
};
