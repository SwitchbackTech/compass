import { toast } from "react-toastify";
import { useCompleteAuthentication } from "@web/auth/compass/useCompleteAuthentication";
import { useGoogleAuthWithOverlay } from "@web/auth/google/hooks/useGoogleAuthWithOverlay/useGoogleAuthWithOverlay";
import { isGooglePopupClosedError } from "@web/auth/google/util/google-oauth-error.util";
import { authenticate } from "@web/auth/google/util/google.auth.util";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";
import {
  SESSION_EXPIRED_TOAST_ID,
  dismissErrorToast,
} from "@web/common/utils/toast/error-toast.util";
import {
  authError,
  authSuccess,
  resetAuth,
  startAuthenticating,
} from "@web/ducks/auth/slices/auth.slice";
import { type AppDispatch } from "@web/store";
import { useAppDispatch } from "@web/store/store.hooks";
import { type GoogleAuthConfig } from "../googe.auth.types";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Authentication failed";
};

const handleAuthError = (dispatch: AppDispatch, error: unknown) => {
  console.error(error);
  dispatch(authError(getErrorMessage(error)));
};

const resetAuthState = (dispatch: AppDispatch) => {
  dispatch(resetAuth());
};

export function useGoogleAuth(
  options: {
    onSuccess?: (data: GoogleAuthConfig) => Promise<boolean | void>;
    prompt?: "consent" | "none" | "select_account";
    shouldTryLinkingWithSessionUser?: boolean;
  } = {},
) {
  const dispatch = useAppDispatch();
  const completeAuthentication = useCompleteAuthentication();
  const { onSuccess, prompt, shouldTryLinkingWithSessionUser } = options;

  const googleLogin = useGoogleAuthWithOverlay({
    prompt,
    shouldTryLinkingWithSessionUser,
    onStart: () => {
      dismissErrorToast(SESSION_EXPIRED_TOAST_ID);
      dispatch(startAuthenticating());
    },
    onSuccess: async (data) => {
      if (onSuccess) {
        const shouldCompleteAuth = await onSuccess(data);
        if (shouldCompleteAuth === false) {
          resetAuthState(dispatch);
          return;
        }
        dispatch(authSuccess());
        return;
      }

      const authPayload: GoogleAuthConfig = {
        ...data,
      };
      const authResult = await authenticate(authPayload);
      if (!authResult.success) {
        toast.error(
          "Failed to connect Google Calendar. Please try again.",
          toastDefaultOptions,
        );
        handleAuthError(dispatch, authResult.error);
        return;
      }
      if (authResult.data !== undefined && authResult.data.status !== "OK") {
        toast.error(
          "Could not link Google Calendar to your account. Please try again.",
          toastDefaultOptions,
        );
        dispatch(resetAuth());
        return;
      }
      const email = authResult.data?.user?.emails?.[0];
      await completeAuthentication({ email });
    },
    onError: (error) => {
      if (isGooglePopupClosedError(error)) {
        resetAuthState(dispatch);
        return;
      }

      handleAuthError(dispatch, error);
    },
  });

  return googleLogin;
}
