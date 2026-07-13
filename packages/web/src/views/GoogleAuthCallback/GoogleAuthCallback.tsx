import { useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AuthApi } from "@web/api/auth.api";
import { queryClient } from "@web/api/query-client";
import { useCompleteAuthentication } from "@web/auth/compass/hooks/useCompleteAuthentication";
import { session } from "@web/auth/compass/session/Session";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { completeGoogleAuthorization } from "@web/auth/google/authorization/complete-google-authorization";
import { releaseNotesPromptActions } from "@web/auth/state/release-notes-prompt.store";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";

type CompleteAuthentication = ReturnType<typeof useCompleteAuthentication>;

type CompleteGoogleAuthCallbackOptions = {
  completeAuthentication: CompleteAuthentication;
  navigate: (path: string, opts: { replace: true }) => void;
  search: string;
};

export async function completeGoogleAuthCallback({
  completeAuthentication,
  navigate,
  search,
}: CompleteGoogleAuthCallbackOptions): Promise<void> {
  const result = await completeGoogleAuthorization({
    authApi: AuthApi,
    completeAuthentication,
    doesSessionExist: () => session.doesSessionExist(),
    refreshUserMetadata,
    requestEventFetch: () =>
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all }),
    search,
  });

  if (result.status === "failed") {
    showErrorToast(result.message);
  } else if (result.isNewUser) {
    releaseNotesPromptActions.open();
  }

  navigate(result.returnPath, { replace: true });
}

export function GoogleAuthCallbackView() {
  const didRun = useRef(false);
  const location = useLocation();
  const router = useRouter();
  const completeAuthentication = useCompleteAuthentication();

  useEffect(() => {
    if (didRun.current) {
      return;
    }

    didRun.current = true;

    void completeGoogleAuthCallback({
      completeAuthentication,
      navigate: (path) => router.history.replace(path),
      search: location.searchStr,
    });
  }, [completeAuthentication, location.searchStr, router]);

  return (
    <OverlayPanel
      title="Just finishing up …"
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
