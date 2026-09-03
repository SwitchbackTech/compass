import { useEffect } from "react";
import { type BillingSubscriptionStatus } from "@core/types/user.types";
import {
  selectIsCelebrating,
  useCheckoutCelebrationStore,
} from "@web/billing/checkout-celebration.store";
import { type AppAccess, useAppAccess } from "@web/billing/useAppAccess";

type BillingWriteLockState = {
  locked: boolean;
  status: BillingSubscriptionStatus | null;
};

const unlocked: BillingWriteLockState = { locked: false, status: null };

let state: BillingWriteLockState = unlocked;

export function isWriteLockedAccess(access: AppAccess): boolean {
  return access.kind === "server" && access.isReadOnly;
}

export function setBillingWriteLock(next: BillingWriteLockState): void {
  state = next;
}

export function isBillingWriteLocked(): boolean {
  return state.locked;
}

export function getBillingWriteLockStatus(): BillingSubscriptionStatus | null {
  return state.status;
}

export function resetBillingWriteLockForTests(): void {
  state = unlocked;
}

/**
 * True while a signed-in account cannot write (awaiting checkout, expired,
 * canceled) and the checkout celebration is not covering the screen.
 */
export function useShortcutWriteLocked(): boolean {
  const access = useAppAccess();
  const isCelebrating = useCheckoutCelebrationStore(selectIsCelebrating);
  return isWriteLockedAccess(access) && !isCelebrating;
}

/**
 * Mirrors read-only billing onto a module flag that keyboard handlers can
 * read without subscribing. Mount once from RootShell.
 */
export function useSyncBillingWriteLock(): void {
  const access = useAppAccess();
  const isCelebrating = useCheckoutCelebrationStore(selectIsCelebrating);
  const locked = isWriteLockedAccess(access) && !isCelebrating;
  const status = access.kind === "server" ? access.status : null;

  useEffect(() => {
    setBillingWriteLock({ locked, status });
    return () => setBillingWriteLock(unlocked);
  }, [locked, status]);
}
