import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export function hasMutedShortcutTips(): boolean {
  return (
    persistentBrowserStore.get(STORAGE_KEYS.SHORTCUT_TIPS_MUTED) === "true"
  );
}

export function muteShortcutTips(): void {
  persistentBrowserStore.set(STORAGE_KEYS.SHORTCUT_TIPS_MUTED, "true");
}
