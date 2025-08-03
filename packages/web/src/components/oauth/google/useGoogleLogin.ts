import { useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useGoogleLogin as useGoogleLoginBase } from "@react-oauth/google";

const SCOPES_REQUIRED = [
  "email",
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
  onStart: () => void;
  onSuccess: (code: string) => void;
  onError: (error: unknown) => void;
}) => {
  const antiCsrfToken = useRef(uuidv4()).current;

  return useGoogleLoginBase({
    flow: "auth-code",
    scope: SCOPES_REQUIRED.join(" "),
    state: antiCsrfToken,
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

      onStart();

      try {
        onSuccess(code);
      } catch (e) {
        console.error(e);
        alert("Login failed. Please try again.");
        onError(e);
      }
    },
    onError: (error) => {
      alert(`Login failed because: ${error.error}`);
      console.error(error);
      onError(error);
    },
  });
};
