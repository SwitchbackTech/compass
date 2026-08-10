import { type FC, useContext, useEffect, useRef } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { track } from "@web/auth/posthog/track";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { postOnboardingFlowActions } from "@web/components/PostOnboardingFlow/post-onboarding-flow.store";

/**
 * "Ready to try it for real?" — the last step of the connect/trial flow.
 * Billing does not exist yet (see keyboard-education/03), so accepting for
 * an anonymous user opens signup; an already-authenticated user (arrived via
 * Connect Google, which signs up on its own) gets a coming-soon toast in
 * place of real checkout until 03 ships.
 */
export const TrialCTA: FC = () => {
  const { authenticated } = useContext(SessionContext);
  const { openModal } = useAuthModal();
  const shownRef = useRef(false);

  useEffect(() => {
    if (!shownRef.current) {
      shownRef.current = true;
      track("trial_cta_shown");
    }
  }, []);

  const onStartTrial = () => {
    track("trial_started");
    if (!authenticated) {
      openModal("signUp");
      return;
    }
    postOnboardingFlowActions.dismissTrial();
  };

  return (
    <section
      aria-label="Start your trial"
      className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4"
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-surface/95 px-5 py-4 text-text shadow-xl backdrop-blur-2xl backdrop-saturate-150">
        <p className="mb-1 font-medium text-sm">Ready to try it for real?</p>
        <p className="text-sm text-text-muted">
          Start a free trial and keep everything you just set up.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            className="c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:text-text"
            onClick={postOnboardingFlowActions.dismissTrial}
            type="button"
          >
            Not right now
          </button>
          <button
            className="c-button c-button-primary rounded-full px-4 py-1.5 text-xs"
            onClick={onStartTrial}
            type="button"
          >
            Start free trial
          </button>
        </div>
      </div>
    </section>
  );
};
