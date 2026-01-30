import { useEffect, useRef } from "react";
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
    onStart: () => {
      loginStartedRef.current = true;
      setIsSyncing(true);
      onStart?.();
    },
    onSuccess: async (data) => {
      loginStartedRef.current = false;
      await onSuccess?.(data);

      if (!isSyncingRetainedOnSuccess) {
        setIsSyncing(false);
      }
    },
    onError: (error) => {
      loginStartedRef.current = false;
      setIsSyncing(false);
      onError?.(error);
    },
  });

  useEffect(() => {
    if (loginStartedRef.current && !googleLogin.loading) {
      loginStartedRef.current = false;
      setIsSyncing(false);
    }
  }, [googleLogin.loading, setIsSyncing]);

  return googleLogin;
};
