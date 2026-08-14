import { useContext } from "react";
import { type BillingSubscriptionStatus } from "@core/types/user.types";
import { SessionContext } from "@web/auth/compass/session/session.context";
import {
  isBillingEnforced,
  useAppConfigQuery,
  useBillingStatusQuery,
} from "@web/billing/billing.query";
import { useTrialStatus } from "@web/billing/useTrialStatus";

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
 * Signed-in users read `/api/billing/status`. Fail open: a loading, error,
 * unconfigured-Stripe, or paused-enforcement state never locks a paying user
 * out of their calendar.
 */
export function useAppAccess(): AppAccess {
  const { authenticated } = useContext(SessionContext);
  const trial = useTrialStatus();
  const configQuery = useAppConfigQuery();
  const enforced = isBillingEnforced(configQuery.data);
  const billingEnabled =
    enforced &&
    authenticated &&
    !trial.isAnonymousTrial &&
    configQuery.data?.billing.isConfigured === true;
  const billingQuery = useBillingStatusQuery(billingEnabled);

  if (!enforced) {
    return { kind: "open" };
  }

  if (trial.isAnonymousTrial) {
    return {
      kind: "anonymous-trial",
      isExpired: trial.isExpired,
      daysLeft: trial.daysLeft,
    };
  }

  if (!authenticated) {
    return { kind: "open" };
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
