import {
  dismissAwaitingCheckoutBannerForSession,
  isAwaitingCheckoutBannerDismissedForSession,
  resetAwaitingCheckoutBannerDismissForTests,
} from "@web/billing/awaiting-checkout-banner.util";
import { afterEach, describe, expect, it } from "bun:test";

describe("awaiting checkout banner session dismiss", () => {
  afterEach(() => {
    resetAwaitingCheckoutBannerDismissForTests();
  });

  it("starts visible each session until dismissed", () => {
    expect(isAwaitingCheckoutBannerDismissedForSession()).toBe(false);
    dismissAwaitingCheckoutBannerForSession();
    expect(isAwaitingCheckoutBannerDismissedForSession()).toBe(true);
  });

  it("returns after the session store is cleared", () => {
    dismissAwaitingCheckoutBannerForSession();
    resetAwaitingCheckoutBannerDismissForTests();
    expect(isAwaitingCheckoutBannerDismissedForSession()).toBe(false);
  });
});
