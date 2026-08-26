import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

/**
 * Device-local opt-in, deliberately not synced: a grant belongs to one
 * browser profile, so a pref that outran it would promise notifications the
 * browser will never deliver.
 */
export function isNotificationsPrefEnabled(): boolean {
  return (
    persistentBrowserStore.get(STORAGE_KEYS.NOTIFICATIONS_ENABLED) === "true"
  );
}

export function persistNotificationsPref(enabled: boolean): void {
  if (enabled) {
    persistentBrowserStore.set(STORAGE_KEYS.NOTIFICATIONS_ENABLED, "true");
    return;
  }
  persistentBrowserStore.remove(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
}
