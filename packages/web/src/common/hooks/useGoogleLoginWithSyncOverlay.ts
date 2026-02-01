import { useCallback, useEffect, useRef } from "react";
import { useSession } from "@web/auth/hooks/useSession";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

interface UseGoogleLoginWithSyncOverlayOptions {
  onStart?: () => void;
  onSuccess?: (res: SignInUpInput) => Promise<void>;
  onError?: (error: unknown) => void;
  isSyncingRetainedOnSuccess?: boolean;
}

export const useGoogleLoginWithSyncOverlay = (
  options: UseGoogleLoginWithSyncOverlayOptions = {},
) => {
  const {
    onStart,
    onSuccess,
    onError,
    isSyncingRetainedOnSuccess = false,
  } = options;
  const { setIsSyncing } = useSession();
  const loginStartedRef = useRef(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (data) => {
      loginStartedRef.current = false;
      try {
        await onSuccess?.(data);

        if (!isSyncingRetainedOnSuccess) {
          setIsSyncing(false);
        }
      } catch (error) {
        // If onSuccess throws an error, always clear isSyncing to prevent stuck overlay
        // This handles cases where authentication fails or other errors occur
        setIsSyncing(false);
        // Call onError to handle the error appropriately
        onError?.(error);
      }
    },
    onError: (error) => {
      loginStartedRef.current = false;
      setIsSyncing(false);
      onError?.(error);
    },
  });

  useEffect(() => {
    // Cleanup: if component unmounts while login is in progress, clear isSyncing
    return () => {
      if (loginStartedRef.current) {
        setIsSyncing(false);
      }
    };
  }, [setIsSyncing]);

  const login = useCallback(() => {
    loginStartedRef.current = true;
    setIsSyncing(true);
    onStart?.();
    return googleLogin.login();
  }, [googleLogin, onStart, setIsSyncing]);

  return {
    ...googleLogin,
    login,
  };
};
