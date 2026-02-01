import { useCallback, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useGoogleLogin as useGoogleLoginBase } from "@react-oauth/google";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

const SCOPES_REQUIRED = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

const isMissingPermissions = (scope: string) => {
  const scopesGranted = scope.split(" ");
  return SCOPES_REQUIRED.some((s) => !scopesGranted.includes(s));
};

export const useGoogleLogin = ({
  onStart,
  onSuccess,
  onError,
}: {
  onStart?: () => void;
  onSuccess?: (res: SignInUpInput) => Promise<void>;
  onError?: (error: unknown) => void;
}) => {
  const [data, setData] = useState<{
    code: string;
    scope: string;
    state: string | undefined;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const antiCsrfToken = useRef(uuidv4()).current;

  const login = useGoogleLoginBase({
    flow: "auth-code",
    scope: SCOPES_REQUIRED.join(" "),
    state: antiCsrfToken,
    onNonOAuthError(nonOAuthError) {
      setLoading(false);
      console.error(nonOAuthError);
      onError?.(nonOAuthError);
    },
    onSuccess: async ({ code, scope, state }) => {
      const isFromHacker = state !== antiCsrfToken;
      if (isFromHacker) {
        alert("Nice try, hacker");
        return;
      }

      if (isMissingPermissions(scope)) {
        alert("Missing permissions, please click all the checkboxes");
        return;
      }

      try {
        await onSuccess?.({
          thirdPartyId: "google",
          clientType: "web",
          redirectURIInfo: {
            redirectURIOnProviderDashboard: window.location.origin,
            redirectURIQueryParams: { code, state, scope },
          },
        });

        setData({ code, scope, state });
      } catch (e) {
        console.error(e);
        alert("Login failed. Please try again.");
        onError?.(e);
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      setLoading(false);
      alert(`Login failed because: ${error.error}`);
      console.error(error);
      onError?.(error);
    },
  });

  return {
    login: useCallback(async () => {
      onStart?.();
      setData(null);
      setLoading(true);

      return login();
    }, [login, onStart, setData, setLoading]),
    data,
    loading,
  };
};
