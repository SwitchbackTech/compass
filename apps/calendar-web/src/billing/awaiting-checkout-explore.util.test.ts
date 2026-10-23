import { defersAwaitingCheckoutGateToCommit } from "@web/billing/awaiting-checkout-explore.util";
import {
  resetBillingWriteLockForTests,
  setBillingWriteLock,
} from "@web/billing/billing-write-lock";
import { afterEach, describe, expect, it } from "bun:test";

describe("defersAwaitingCheckoutGateToCommit", () => {
  afterEach(() => {
    resetBillingWriteLockForTests();
  });

  it("is true only for awaiting_checkout write lock", () => {
    expect(defersAwaitingCheckoutGateToCommit()).toBe(false);
    setBillingWriteLock({ locked: true, status: "awaiting_checkout" });
    expect(defersAwaitingCheckoutGateToCommit()).toBe(true);
    setBillingWriteLock({ locked: true, status: "expired" });
    expect(defersAwaitingCheckoutGateToCommit()).toBe(false);
  });
});
