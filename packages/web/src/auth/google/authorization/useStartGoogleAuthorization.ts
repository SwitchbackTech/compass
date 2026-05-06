import {
  type UseGoogleLoginOptionsAuthCodeFlow,
  useGoogleLogin as useGoogleLoginBase,
} from "@react-oauth/google";
import { useCallback, useMemo, useState } from "react";
import { GOOGLE_AUTH_SCOPES_REQUIRED } from "./google-authorization.constants";
import {
  type GoogleAuthorizationIntent,
  writeGoogleAuthorizationIntent,
} from "./google-authorization.storage";
import {
  buildGoogleAuthCallbackUrl,
  getSafeGoogleAuthReturnPath,
} from "./google-authorization.util";

export const useStartGoogleAuthorization = ({
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
  const [state] = useState(() => crypto.randomUUID());
  const [redirectUri] = useState(buildGoogleAuthCallbackUrl);

  const loginOptions = useMemo<
    UseGoogleLoginOptionsAuthCodeFlow & {
      prompt?: "consent" | "none" | "select_account";
    }
  >(
    () => ({
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
    }),
    [onError, prompt, redirectUri, state],
  );

  const startGoogleAuthorization = useGoogleLoginBase(loginOptions);

  return {
    loading,
    startGoogleAuthorization: useCallback(() => {
      onStart?.();
      setLoading(true);
      writeGoogleAuthorizationIntent(state, {
        intent,
        returnPath: getSafeGoogleAuthReturnPath(),
        createdAt: Date.now(),
      });
      return startGoogleAuthorization();
    }, [intent, onStart, startGoogleAuthorization, state]),
  };
};
