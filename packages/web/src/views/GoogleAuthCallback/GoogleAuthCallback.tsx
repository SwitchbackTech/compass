import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompleteAuthentication } from "@web/auth/compass/hooks/useCompleteAuthentication";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import {
  clearGoogleAuthorizationIntent,
  readGoogleAuthorizationIntent,
} from "@web/auth/google/redirect/google-auth-redirect.storage";
import {
  buildGoogleAuthCallbackUrl,
  buildGoogleAuthCodePayload,
} from "@web/auth/google/redirect/google-auth-redirect.util";
import { AuthApi } from "@web/common/apis/auth.api";
import {
  isApiError,
  parseGoogleConnectError,
} from "@web/common/apis/util/api.util";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { type AppDispatch } from "@web/store";
import { useAppDispatch } from "@web/store/store.hooks";

const GENERIC_GOOGLE_AUTH_ERROR =
  "Google authorization could not be completed. Please try again.";

type CompleteAuthentication = ReturnType<typeof useCompleteAuthentication>;

type CompleteGoogleAuthCallbackOptions = {
  completeAuthentication: CompleteAuthentication;
  dispatch: AppDispatch;
  navigate: ReturnType<typeof useNavigate>;
  search: string;
};

export async function completeGoogleAuthCallback({
  completeAuthentication,
  dispatch,
  navigate,
  search,
}: CompleteGoogleAuthCallbackOptions): Promise<void> {
  const params = new URLSearchParams(search);
  const state = params.get("state");
  const fallbackPath = ROOT_ROUTES.DAY;

  if (!state) {
    showErrorToast(GENERIC_GOOGLE_AUTH_ERROR);
    navigate(fallbackPath, { replace: true });
    return;
  }

  const savedIntent = readGoogleAuthorizationIntent(state);
  clearGoogleAuthorizationIntent(state);
  const returnPath = savedIntent?.returnPath ?? fallbackPath;

  if (!savedIntent || params.get("error")) {
    showErrorToast(GENERIC_GOOGLE_AUTH_ERROR);
    navigate(returnPath, { replace: true });
    return;
  }

  const code = params.get("code");

  if (!code) {
    showErrorToast(GENERIC_GOOGLE_AUTH_ERROR);
    navigate(returnPath, { replace: true });
    return;
  }

  const payload = buildGoogleAuthCodePayload({
    code,
    scope: params.get("scope") ?? undefined,
    state,
    redirectUri: buildGoogleAuthCallbackUrl(),
  });

  try {
    if (savedIntent.intent === "signIn") {
      const result = await AuthApi.loginOrSignup(payload);
      await completeAuthentication({
        email: result.user.emails?.[0],
      });
    } else {
      await AuthApi.connectGoogle(payload);
      await refreshUserMetadata();
      dispatch(triggerFetch());
    }

    navigate(returnPath, { replace: true });
  } catch (error) {
    if (isApiError(error)) {
      const parsed = parseGoogleConnectError(error);

      if (parsed?.message) {
        showErrorToast(parsed.message);
        navigate(returnPath, { replace: true });
        return;
      }
    }

    showErrorToast(GENERIC_GOOGLE_AUTH_ERROR);
    navigate(returnPath, { replace: true });
  }
}

export function GoogleAuthCallbackView() {
  const didRun = useRef(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const completeAuthentication = useCompleteAuthentication();

  useEffect(() => {
    if (didRun.current) {
      return;
    }

    didRun.current = true;

    void completeGoogleAuthCallback({
      completeAuthentication,
      dispatch,
      navigate,
      search: window.location.search,
    });
  }, [completeAuthentication, dispatch, navigate]);

  return (
    <OverlayPanel
      title="Completing Google authorization..."
      message="Returning you to Compass."
      role="status"
      variant="status"
      icon={
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-border-primary border-t-text-lighter"
          aria-hidden="true"
        />
      }
    />
  );
}
