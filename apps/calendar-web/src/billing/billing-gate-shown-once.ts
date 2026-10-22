/** Dedupes `billing_gate_shown` for awaiting_checkout within one page load. */
let awaitingCheckoutGateShown = false;

export function shouldTrackBillingGateShown(status: string): boolean {
  if (status !== "awaiting_checkout") {
    return true;
  }
  if (awaitingCheckoutGateShown) {
    return false;
  }
  awaitingCheckoutGateShown = true;
  return true;
}

export function resetBillingGateShownOnceForTests(): void {
  awaitingCheckoutGateShown = false;
}
