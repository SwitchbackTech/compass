import { useCallback } from "react";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

interface UseGoogleAuthWithOverlayOptions {
  onStart?: () => void;
  onSuccess?: (res: SignInUpInput) => Promise<void>;
  onError?: (error: unknown) => void;
}

export const useGoogleAuthWithOverlay = (
  options: UseGoogleAuthWithOverlayOptions = {},
) => {
  const { onStart, onSuccess, onError } = options;

  const googleLogin = useGoogleLogin({
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
    return googleLogin.login();
  }, [googleLogin, onStart]);

  return {
    ...googleLogin,
    login,
  };
};
