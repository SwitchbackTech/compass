import {
  isAwaitingCheckoutWriteLocked,
  isWriteLockedAccess,
  resetBillingWriteLockForTests,
  setBillingWriteLock,
} from "@web/billing/billing-write-lock";
import { type AppAccess } from "@web/billing/useAppAccess";
import { afterEach, describe, expect, it } from "bun:test";

describe("isWriteLockedAccess", () => {
  it("is false for anonymous and self-hosted visitors", () => {
    expect(isWriteLockedAccess({ kind: "open" })).toBe(false);
  });

  it("follows the server read-only flag", () => {
    const locked: AppAccess = {
      kind: "server",
      status: "awaiting_checkout",
      isReadOnly: true,
      trialEndsAt: null,
    };
    const writable: AppAccess = {
      kind: "server",
      status: "active",
      isReadOnly: false,
      trialEndsAt: null,
    };

    expect(isWriteLockedAccess(locked)).toBe(true);
    expect(isWriteLockedAccess(writable)).toBe(false);
  });
});

describe("isAwaitingCheckoutWriteLocked", () => {
  afterEach(() => {
    resetBillingWriteLockForTests();
  });

  it("is true only for awaiting_checkout write locks", () => {
    expect(isAwaitingCheckoutWriteLocked()).toBe(false);

    setBillingWriteLock({ locked: true, status: "expired" });
    expect(isAwaitingCheckoutWriteLocked()).toBe(false);

    setBillingWriteLock({ locked: true, status: "awaiting_checkout" });
    expect(isAwaitingCheckoutWriteLocked()).toBe(true);
  });
});
