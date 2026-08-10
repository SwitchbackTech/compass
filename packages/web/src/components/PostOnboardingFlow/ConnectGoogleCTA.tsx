import { type FC, useEffect, useRef } from "react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { track } from "@web/auth/posthog/track";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { postOnboardingFlowActions } from "@web/components/PostOnboardingFlow/post-onboarding-flow.store";

/**
 * Shown once, right after the onboarding tour ends. Connecting starts a
 * background import (see useGoogleUiState / isFirstImportInProgress) so the
 * user is never blocked from continuing to explore.
 */
export const ConnectGoogleCTA: FC = () => {
  const { connect, isAvailable } = useConnectGoogle();
  const shownRef = useRef(false);

  useEffect(() => {
    if (!isAvailable) {
      // isAvailable starts false while the /config fetch that determines it
      // is still in flight, so an instant skip here would race that fetch
      // and strand real deployments. Give it a moment; if Google genuinely
      // isn't configured, don't leave the user stuck on a step with nothing
      // to click.
      const timer = window.setTimeout(() => {
        if (!isAvailable) postOnboardingFlowActions.skipConnect();
      }, 4000);
      return () => window.clearTimeout(timer);
    }
    if (!shownRef.current) {
      shownRef.current = true;
      track("connect_cta_shown");
    }
  }, [isAvailable]);

  if (!isAvailable) return null;

  const onConnect = () => {
    postOnboardingFlowActions.acceptConnect();
    connect();
  };

  return (
    <section
      aria-label="Connect Google Calendar"
      className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4"
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-surface/95 px-5 py-4 text-text shadow-xl backdrop-blur-2xl backdrop-saturate-150">
        <p className="mb-1 font-medium text-sm">Bring in your calendar</p>
        <p className="text-sm text-text-muted">
          Connect Google Calendar and we will import your events in the
          background while you keep exploring. You can always do this later.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            className="c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:text-text"
            onClick={postOnboardingFlowActions.skipConnect}
            type="button"
          >
            Skip for now
          </button>
          <button
            className="c-button c-button-primary rounded-full px-4 py-1.5 text-xs"
            onClick={onConnect}
            type="button"
          >
            Connect Google
          </button>
        </div>
      </div>
    </section>
  );
};
