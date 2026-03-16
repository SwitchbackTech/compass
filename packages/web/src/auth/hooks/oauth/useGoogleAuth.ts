import { isGooglePopupClosedError } from "@web/auth/google/google-oauth-error.util";
import { authenticate } from "@web/auth/google/google.auth.util";
import { useGoogleAuthWithOverlay } from "@web/auth/hooks/oauth/useGoogleAuthWithOverlay";
import { useCompleteAuthentication } from "@web/auth/hooks/useCompleteAuthentication";
import {
  SESSION_EXPIRED_TOAST_ID,
  dismissErrorToast,
} from "@web/common/utils/toast/error-toast.util";
import { type SignInUpInput } from "@web/components/oauth/ouath.types";
import {
  authError,
  resetAuth,
  startAuthenticating,
} from "@web/ducks/auth/slices/auth.slice";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { useAppDispatch } from "@web/store/store.hooks";

export function useGoogleAuth(
  options: {
    shouldTryLinkingWithSessionUser?: boolean;
    prompt?: "consent" | "none" | "select_account";
  } = {},
) {
  const dispatch = useAppDispatch();
  const completeAuthentication = useCompleteAuthentication();
  const { shouldTryLinkingWithSessionUser, prompt } = options;

  const googleLogin = useGoogleAuthWithOverlay({
    prompt,
    onStart: () => {
      dismissErrorToast(SESSION_EXPIRED_TOAST_ID);
      dispatch(startAuthenticating());
      dispatch(importGCalSlice.actions.clearImportResults(undefined));
    },
    onSuccess: async (data) => {
      try {
        const authPayload: SignInUpInput = {
          ...data,
          shouldTryLinkingWithSessionUser,
        };
        const authResult = await authenticate(authPayload);
        if (!authResult.success) {
          console.error(authResult.error);
          dispatch(
            authError(authResult.error?.message || "Authentication failed"),
          );
          dispatch(importGCalSlice.actions.setIsImportPending(false));
          dispatch(importGCalSlice.actions.importing(false));
          return;
        }

        await completeAuthentication({
          email: authResult.data?.user?.emails?.[0],
        });
      } catch (error) {
        // Ensure overlay is dismissed if any error occurs during the auth flow
        // This handles cases where authenticate() or other operations throw unexpected errors
        console.error("Error during authentication flow:", error);
        dispatch(
          authError(
            error instanceof Error ? error.message : "Authentication failed",
          ),
        );
        dispatch(importGCalSlice.actions.setIsImportPending(false));
        dispatch(importGCalSlice.actions.importing(false));
        throw error; // Re-throw so useGoogleLoginWithSyncOverlay can handle it via onError
      }
    },
    onError: (error) => {
      if (isGooglePopupClosedError(error)) {
        dispatch(resetAuth());
        dispatch(importGCalSlice.actions.setIsImportPending(false));
        dispatch(importGCalSlice.actions.importing(false));
        return;
      }

      console.error(error);
      dispatch(
        authError(
          error instanceof Error ? error.message : "Authentication failed",
        ),
      );
      dispatch(importGCalSlice.actions.setIsImportPending(false));
      dispatch(importGCalSlice.actions.importing(false));
    },
  });

  return googleLogin;
}
