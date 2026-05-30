import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCompleteAuthentication } from "@web/auth/compass/hooks/useCompleteAuthentication";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { completeGoogleAuthorization } from "@web/auth/google/authorization/complete-google-authorization";
import { AuthApi } from "@web/common/apis/auth.api";
import { session } from "@web/common/classes/Session";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { type AppDispatch } from "@web/store";
import { useAppDispatch } from "@web/store/store.hooks";

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
  const result = await completeGoogleAuthorization({
    authApi: AuthApi,
    completeAuthentication,
    doesSessionExist: () => session.doesSessionExist(),
    refreshUserMetadata,
    requestEventFetch: () => dispatch(triggerFetch()),
    search,
  });

  if (result.status === "failed") {
    showErrorToast(result.message);
  }

  navigate(result.returnPath, { replace: true });
}

export function GoogleAuthCallbackView() {
  const didRun = useRef(false);
  const location = useLocation();
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
      search: location.search,
    });
  }, [completeAuthentication, dispatch, location.search, navigate]);

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
