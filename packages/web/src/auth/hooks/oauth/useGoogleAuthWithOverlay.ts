import { useCallback } from "react";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { type SignInUpInput } from "@web/components/oauth/ouath.types";

interface UseGoogleAuthWithOverlayOptions {
  onStart?: () => void;
  onSuccess?: (res: SignInUpInput) => Promise<boolean | void>;
  onError?: (error: unknown) => void;
  prompt?: "consent" | "none" | "select_account";
  shouldTryLinkingWithSessionUser?: boolean;
}

export const useGoogleAuthWithOverlay = (
  options: UseGoogleAuthWithOverlayOptions = {},
) => {
  const {
    onStart,
    onSuccess,
    onError,
    prompt,
    shouldTryLinkingWithSessionUser,
  } = options;

  const googleLogin = useGoogleLogin({
    prompt,
    shouldTryLinkingWithSessionUser,
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
