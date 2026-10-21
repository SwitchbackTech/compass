import {
  getBillingWriteLockStatus,
  isBillingWriteLocked,
} from "@web/billing/billing-write-lock";
import { requestTrialStep } from "@web/billing/trial-step-request";

/**
 * Blocks an event write for `awaiting_checkout` and opens the trial step.
 * Returns true when the write must not proceed.
 */
export function blockAwaitingCheckoutEventWrite(): boolean {
  if (!isBillingWriteLocked()) return false;
  if (getBillingWriteLockStatus() !== "awaiting_checkout") return false;
  void requestTrialStep({ trigger: "write" });
  return true;
}
