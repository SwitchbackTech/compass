import { useCallback } from "react";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { type SignInUpInput } from "@web/components/oauth/ouath.types";

interface UseGoogleAuthWithOverlayOptions {
  onStart?: () => void;
  onSuccess?: (res: SignInUpInput) => Promise<void>;
  onError?: (error: unknown) => void;
}

const isPromiseLike = (
  value: unknown,
): value is PromiseLike<unknown> & { catch: (reason?: unknown) => unknown } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "then" in value &&
    typeof value.then === "function" &&
    "catch" in value &&
    typeof value.catch === "function"
  );
};

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

    try {
      const result = googleLogin.login();

      // Some OAuth providers reject the returned promise when the popup closes.
      // Handle that path so it doesn't surface as an unhandled rejection.
      if (isPromiseLike(result)) {
        void result.catch((error: unknown) => {
          onError?.(error);
        });
      }
    } catch (error) {
      onError?.(error);
    }
  }, [googleLogin, onError, onStart]);

  return {
    ...googleLogin,
    login,
  };
};
