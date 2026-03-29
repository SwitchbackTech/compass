import { toast } from "react-toastify";
import { isGooglePopupClosedError } from "@web/auth/google/google-oauth-error.util";
import { authenticate } from "@web/auth/google/google.auth.util";
import { useGoogleAuthWithOverlay } from "@web/auth/hooks/oauth/useGoogleAuthWithOverlay";
import { useCompleteAuthentication } from "@web/auth/hooks/useCompleteAuthentication";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";
import {
  SESSION_EXPIRED_TOAST_ID,
  dismissErrorToast,
} from "@web/common/utils/toast/error-toast.util";
import { type SignInUpInput } from "@web/components/oauth/ouath.types";
import {
  authError,
  authSuccess,
  resetAuth,
  startAuthenticating,
} from "@web/ducks/auth/slices/auth.slice";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { type AppDispatch } from "@web/store";
import { useAppDispatch } from "@web/store/store.hooks";

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
    onSuccess?: (data: SignInUpInput) => Promise<boolean | void>;
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
      dispatch(importGCalSlice.actions.clearImportResults(undefined));
    },
    onSuccess: async (data) => {
      if (onSuccess) {
        const wasHandled = await onSuccess(data);
        if (wasHandled === false) {
          dispatch(resetAuth());
          return;
        }
        dispatch(authSuccess());
        return;
      }

      const authPayload: SignInUpInput = {
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
