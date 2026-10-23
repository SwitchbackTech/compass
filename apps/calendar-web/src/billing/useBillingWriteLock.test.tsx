import { renderHook } from "@testing-library/react";
import {
  getBillingWriteLockStatus,
  isBillingWriteLocked,
  resetBillingWriteLockForTests,
} from "@web/billing/billing-write-lock";
import { type AppAccess } from "@web/billing/useAppAccess";
import { useSyncBillingWriteLock } from "@web/billing/useBillingWriteLock";
import { afterEach, describe, expect, it, mock } from "bun:test";

const accessState: {
  access: AppAccess;
  celebrating: boolean;
} = {
  access: { kind: "open" },
  celebrating: false,
};

mock.module("@web/billing/useAppAccess", () => ({
  useAppAccess: () => accessState.access,
}));

mock.module("@web/billing/checkout-celebration.store", () => ({
  selectIsCelebrating: () => accessState.celebrating,
  useCheckoutCelebrationStore: (selector: (state: unknown) => unknown) =>
    selector({}),
}));

describe("useSyncBillingWriteLock", () => {
  afterEach(() => {
    resetBillingWriteLockForTests();
    accessState.access = { kind: "open" };
    accessState.celebrating = false;
  });

  it("does not clear the lock between dependency updates", () => {
    accessState.access = {
      kind: "server",
      status: "awaiting_checkout",
      isReadOnly: true,
      trialEndsAt: null,
    };

    const { rerender } = renderHook(() => useSyncBillingWriteLock());

    expect(isBillingWriteLocked()).toBe(true);
    expect(getBillingWriteLockStatus()).toBe("awaiting_checkout");

    accessState.access = {
      kind: "server",
      status: "awaiting_checkout",
      isReadOnly: true,
      trialEndsAt: "2099-01-01T00:00:00.000Z",
    };
    rerender();

    expect(isBillingWriteLocked()).toBe(true);
    expect(getBillingWriteLockStatus()).toBe("awaiting_checkout");
  });

  it("clears the lock on unmount", () => {
    accessState.access = {
      kind: "server",
      status: "expired",
      isReadOnly: true,
      trialEndsAt: null,
    };

    const { unmount } = renderHook(() => useSyncBillingWriteLock());
    expect(isBillingWriteLocked()).toBe(true);

    unmount();
    expect(isBillingWriteLocked()).toBe(false);
    expect(getBillingWriteLockStatus()).toBeNull();
  });
});
