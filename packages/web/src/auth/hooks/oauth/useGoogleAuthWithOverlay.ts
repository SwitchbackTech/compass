import { useCallback } from "react";
import { isGooglePopupClosedError } from "@web/auth/google/google-oauth-error.util";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { type SignInUpInput } from "@web/components/oauth/ouath.types";

interface UseGoogleAuthWithOverlayOptions {
  onStart?: () => void;
  onSuccess?: (res: SignInUpInput) => Promise<void>;
  onError?: (error: unknown) => void;
  prompt?: "consent" | "none" | "select_account";
}

export const useGoogleAuthWithOverlay = (
  options: UseGoogleAuthWithOverlayOptions = {},
) => {
  const { onStart, onSuccess, onError, prompt } = options;

  const googleLogin = useGoogleLogin({
    prompt,
    onSuccess: async (data) => {
      try {
        await onSuccess?.(data);
      } catch (error) {
        // Call onError to handle the error appropriately
        onError?.(error);
      }
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const login = useCallback(() => {
    onStart?.();
    try {
      return googleLogin.login();
    } catch (error) {
      // Some popup blockers throw synchronously before OAuth callbacks fire.
      // Normalize that path through onError so auth state can recover safely.
      if (isGooglePopupClosedError(error)) {
        onError?.(error);
        return;
      }

      throw error;
    }
  }, [googleLogin, onError, onStart]);

  return {
    ...googleLogin,
    login,
  };
};
