import { useContext, useEffect, useState } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { hasUserEverAuthenticated } from "@web/auth/compass/state/auth.state.util";
import { track } from "@web/auth/posthog/track";
import {
  ensureTrialStarted,
  getTrialDaysLeft,
  TRIAL_LENGTH_DAYS,
} from "@web/billing/trial.storage";

export type TrialStatus = {
  /** Always false for authenticated users in v1 — no payment product exists
   * yet to gate them against; server billing status governs once Stripe lands. */
  isExpired: boolean;
  daysLeft: number;
  /** True only while the browser-local clock governs, i.e. a visitor who has
   * never signed in. Surfaces that govern trial UI should render on this, not
   * on `authenticated`, which is false until the session check resolves. */
  isAnonymousTrial: boolean;
};

/**
 * Anonymous users run on the browser-local trial clock; signed-in users are
 * never gated in v1 (see 06-trial-spec.md in compass-calendar-internal).
 *
 * `authenticated` starts false and only flips true once the async SuperTokens
 * check resolves, so it cannot be the sole guard: the common path is to try
 * Compass anonymously, sign up, and keep the same browser, which leaves a
 * months-old trial.started-at behind. Gating on that alone would flash "your
 * trial has ended" at a signed-up user on every load. hasUserEverAuthenticated
 * reads localStorage synchronously, so the gate never renders for them.
 */
export function useTrialStatus(): TrialStatus {
  const { authenticated } = useContext(SessionContext);
  const isGateExempt = authenticated || hasUserEverAuthenticated();
  const [daysLeft, setDaysLeft] = useState(() => getTrialDaysLeft());

  useEffect(() => {
    if (ensureTrialStarted()) {
      track("trial_started");
    }
    if (isGateExempt) return;

    const recompute = () => setDaysLeft(getTrialDaysLeft());
    recompute();
    document.addEventListener("visibilitychange", recompute);
    window.addEventListener("focus", recompute);
    return () => {
      document.removeEventListener("visibilitychange", recompute);
      window.removeEventListener("focus", recompute);
    };
  }, [isGateExempt]);

  if (isGateExempt) {
    return {
      isExpired: false,
      daysLeft: TRIAL_LENGTH_DAYS,
      isAnonymousTrial: false,
    };
  }
  return { isExpired: daysLeft <= 0, daysLeft, isAnonymousTrial: true };
}
