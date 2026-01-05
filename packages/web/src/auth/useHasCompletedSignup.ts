import { useCallback, useEffect, useState } from "react";
import {
  getAuthStorage,
  updateAuthStorage,
} from "@web/common/utils/storage/auth.storage.util";

export const useHasCompletedSignup = () => {
  const [hasCompletedSignup, setHasCompletedSignup] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    const checkSignupStatus = () => {
      const { hasCompletedSignup: storedValue } = getAuthStorage();
      setHasCompletedSignup(storedValue);
    };

    checkSignupStatus();
  }, []);

  const markSignupCompleted = useCallback(() => {
    updateAuthStorage({ hasCompletedSignup: true });
    setHasCompletedSignup(true);
  }, [setHasCompletedSignup]);

  return {
    hasCompletedSignup,
    markSignupCompleted,
  };
};
