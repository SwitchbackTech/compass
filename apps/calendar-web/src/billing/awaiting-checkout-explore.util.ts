import { isAwaitingCheckoutWriteLocked } from "@web/billing/billing-write-lock";

/**
 * Explore-first `awaiting_checkout`: users may start drafts and edit locally;
 * the trial step opens on commit (mutations), not on create/edit intent.
 */
export function defersAwaitingCheckoutGateToCommit(): boolean {
  return isAwaitingCheckoutWriteLocked();
}
