import { track } from "@web/auth/posthog/track";
import {
  getBillingWriteLockStatus,
  isBillingWriteLocked,
} from "@web/billing/billing-write-lock";
import { openStartTrialStepModal } from "@web/components/AuthModal/auth-modal-runtime";

export type TrialGateTrigger = "write" | "banner";

let pendingTrigger: TrialGateTrigger | null = null;

/** Copy for StartTrialStep when the user hit a write block. */
export const TRIAL_STEP_WRITE_LEAD =
  "Add a card to start your 7-day free trial and save changes to your calendar.";

export function consumeTrialStepTrigger(): TrialGateTrigger | null {
  const trigger = pendingTrigger;
  pendingTrigger = null;
  return trigger;
}

export function resetTrialStepRequestForTests(): void {
  pendingTrigger = null;
}

/**
 * Opens the in-modal trial step for `awaiting_checkout` accounts. Expired and
 * canceled users keep the full-screen billing gate instead.
 */
export async function requestTrialStep(options: {
  trigger: TrialGateTrigger;
}): Promise<boolean> {
  if (!isBillingWriteLocked()) return false;
  if (getBillingWriteLockStatus() !== "awaiting_checkout") return false;

  pendingTrigger = options.trigger;
  track("trial_gate_triggered", { source: options.trigger });
  track("billing_gate_shown", {
    status: "awaiting_checkout",
    surface: options.trigger === "write" ? "write_attempt" : "explore_banner",
  });
  await openStartTrialStepModal();
  return true;
}
