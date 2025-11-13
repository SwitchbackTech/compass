import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

export const useHasCompletedSignup = () => {
  const [hasCompletedSignup, setHasCompletedSignup] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    const checkSignupStatus = () => {
      const storedValue = localStorage.getItem(
        STORAGE_KEYS.HAS_COMPLETED_SIGNUP,
      );
      setHasCompletedSignup(storedValue === "true");
    };

    checkSignupStatus();
  }, []);

  const markSignupCompleted = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_SIGNUP, "true");
    setHasCompletedSignup(true);
  }, [setHasCompletedSignup]);

  return {
    hasCompletedSignup,
    markSignupCompleted,
  };
};
