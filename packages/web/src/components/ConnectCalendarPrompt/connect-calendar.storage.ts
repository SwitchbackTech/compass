import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export function getConnectCalendarPromptDismissed(): boolean {
  if (!persistentBrowserStore.isAvailable()) return false;
  return (
    persistentBrowserStore.get(
      STORAGE_KEYS.HAS_DISMISSED_CONNECT_CALENDAR_PROMPT,
    ) === "true"
  );
}

export function markConnectCalendarPromptDismissed(): void {
  persistentBrowserStore.set(
    STORAGE_KEYS.HAS_DISMISSED_CONNECT_CALENDAR_PROMPT,
    "true",
  );
}
