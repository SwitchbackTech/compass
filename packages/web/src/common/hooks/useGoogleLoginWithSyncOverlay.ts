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
  const { isSyncing, setIsSyncing } = useSession();
  const loginStartedRef = useRef(false);

  const googleLogin = useGoogleLogin({
    onStart: () => {
      loginStartedRef.current = true;
      setIsSyncing(true);
      onStart?.();
    },
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
    // Handle normal completion: login started and loading finished
    if (loginStartedRef.current && !googleLogin.loading) {
      loginStartedRef.current = false;
      setIsSyncing(false);
      return;
    }

    // Handle remount case: component unmounted during login, remounted after OAuth completed
    // If loading is false, we're not tracking a login (ref is false), but isSyncing is still true,
    // we should clear it to prevent stuck overlay
    if (!loginStartedRef.current && !googleLogin.loading && isSyncing) {
      setIsSyncing(false);
    }

    // Cleanup: if component unmounts while login is in progress, clear isSyncing
    return () => {
      if (loginStartedRef.current) {
        setIsSyncing(false);
      }
    };
  }, [googleLogin.loading, isSyncing, setIsSyncing]);

  return googleLogin;
};
