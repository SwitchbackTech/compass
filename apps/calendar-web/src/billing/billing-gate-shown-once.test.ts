import {
  resetBillingGateShownOnceForTests,
  shouldTrackBillingGateShown,
} from "@web/billing/billing-gate-shown-once";
import { afterEach, describe, expect, it } from "bun:test";

describe("shouldTrackBillingGateShown", () => {
  afterEach(() => {
    resetBillingGateShownOnceForTests();
  });

  it("allows the first awaiting_checkout gate impression only once per load", () => {
    expect(shouldTrackBillingGateShown("awaiting_checkout")).toBe(true);
    expect(shouldTrackBillingGateShown("awaiting_checkout")).toBe(false);
  });

  it("still tracks other statuses", () => {
    expect(shouldTrackBillingGateShown("past_due")).toBe(true);
    expect(shouldTrackBillingGateShown("past_due")).toBe(true);
  });
});
