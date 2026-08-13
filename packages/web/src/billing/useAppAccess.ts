import { useContext, useEffect, useState } from "react";
import { type BillingSubscriptionStatus } from "@core/types/user.types";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { hasUserEverAuthenticated } from "@web/auth/compass/state/auth.state.util";
import { track } from "@web/auth/posthog/track";
import {
  useAppConfigQuery,
  useBillingStatusQuery,
} from "@web/billing/billing.query";
import {
  ensureTrialStarted,
  getTrialDaysLeft,
} from "@web/billing/trial.storage";

export type AppAccess =
  | {
      kind: "anonymous-trial";
      isExpired: boolean;
      daysLeft: number;
    }
  | {
      kind: "server";
      status: BillingSubscriptionStatus;
      isReadOnly: boolean;
      trialEndsAt: string | null;
    }
  | { kind: "open" };

/**
 * Reconciles the anonymous localStorage trial with server billing.
 *
 * Never-signed-up visitors keep today's anonymous trial (and TrialGateModal).
 * Signed-in users read `/api/billing/status`. Fail open: a loading, error, or
 * unconfigured-Stripe state never locks a paying user out of their calendar.
 */
export function useAppAccess(): AppAccess {
  const { authenticated } = useContext(SessionContext);
  const isGateExempt = authenticated || hasUserEverAuthenticated();
  const [daysLeft, setDaysLeft] = useState(() => getTrialDaysLeft());
  const configQuery = useAppConfigQuery();
  const billingEnabled =
    isGateExempt && configQuery.data?.billing.isConfigured === true;
  const billingQuery = useBillingStatusQuery(billingEnabled);

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

  if (!isGateExempt) {
    return {
      kind: "anonymous-trial",
      isExpired: daysLeft <= 0,
      daysLeft,
    };
  }

  if (
    configQuery.isError ||
    configQuery.isPending ||
    configQuery.data?.billing.isConfigured !== true
  ) {
    return { kind: "open" };
  }

  if (billingQuery.isError || billingQuery.isPending || !billingQuery.data) {
    return { kind: "open" };
  }

  return {
    kind: "server",
    status: billingQuery.data.subscriptionStatus,
    isReadOnly: billingQuery.data.isReadOnly,
    trialEndsAt: billingQuery.data.trialEndsAt,
  };
}
