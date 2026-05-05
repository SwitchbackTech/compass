import {
  type UseGoogleLoginOptionsAuthCodeFlow,
  useGoogleLogin as useGoogleLoginBase,
} from "@react-oauth/google";
import { useCallback, useRef, useState } from "react";
import { GOOGLE_AUTH_SCOPES_REQUIRED } from "@web/auth/google/redirect/google-auth-redirect.constants";
import {
  type GoogleAuthorizationIntent,
  writeGoogleAuthorizationIntent,
} from "@web/auth/google/redirect/google-auth-redirect.storage";
import {
  buildGoogleAuthCallbackUrl,
  getSafeGoogleAuthReturnPath,
} from "@web/auth/google/redirect/google-auth-redirect.util";

export const useGoogleLogin = ({
  intent,
  onStart,
  onError,
  prompt,
}: {
  intent: GoogleAuthorizationIntent["intent"];
  onStart?: () => void;
  onError?: (error: unknown) => void;
  prompt?: "consent" | "none" | "select_account";
}) => {
  const [loading, setLoading] = useState(false);
  const state = useRef(crypto.randomUUID()).current;
  const redirectUri = buildGoogleAuthCallbackUrl();

  const loginOptions: UseGoogleLoginOptionsAuthCodeFlow & {
    prompt?: "consent" | "none" | "select_account";
  } = {
    flow: "auth-code",
    scope: GOOGLE_AUTH_SCOPES_REQUIRED.join(" "),
    prompt,
    state,
    ux_mode: "redirect",
    redirect_uri: redirectUri,
    onNonOAuthError(error) {
      setLoading(false);
      onError?.(error);
    },
    onError(error) {
      setLoading(false);
      onError?.(error);
    },
  };

  const login = useGoogleLoginBase(loginOptions);

  return {
    login: useCallback(() => {
      onStart?.();
      setLoading(true);
      writeGoogleAuthorizationIntent(state, {
        intent,
        returnPath: getSafeGoogleAuthReturnPath(),
        createdAt: Date.now(),
      });
      return login();
    }, [intent, login, onStart, state]),
    data: null,
    loading,
  };
};
