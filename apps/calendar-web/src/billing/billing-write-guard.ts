import {
  getBillingWriteLockStatus,
  isBillingWriteLocked,
} from "@web/billing/billing-write-lock";
import {
  requestTrialStep,
  type TrialGateEventAction,
} from "@web/billing/trial-step-request";

/**
 * Blocks an event write for `awaiting_checkout` and opens the trial step.
 * Returns true when the write must not proceed.
 */
export function blockAwaitingCheckoutEventWrite(
  eventAction: TrialGateEventAction,
): boolean {
  if (!isBillingWriteLocked()) return false;
  if (getBillingWriteLockStatus() !== "awaiting_checkout") return false;
  void requestTrialStep({ trigger: "write", eventAction });
  return true;
}
