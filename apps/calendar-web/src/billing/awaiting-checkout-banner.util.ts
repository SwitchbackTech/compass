import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { sessionBrowserStore } from "@web/common/storage/browser-key-value.store";

const DISMISSED_VALUE = "1";

export function isAwaitingCheckoutBannerDismissedForSession(): boolean {
  return (
    sessionBrowserStore.get(STORAGE_KEYS.AWAITING_CHECKOUT_BANNER_DISMISSED) ===
    DISMISSED_VALUE
  );
}

export function dismissAwaitingCheckoutBannerForSession(): void {
  sessionBrowserStore.set(
    STORAGE_KEYS.AWAITING_CHECKOUT_BANNER_DISMISSED,
    DISMISSED_VALUE,
  );
}

export function resetAwaitingCheckoutBannerDismissForTests(): void {
  sessionBrowserStore.remove(STORAGE_KEYS.AWAITING_CHECKOUT_BANNER_DISMISSED);
}
