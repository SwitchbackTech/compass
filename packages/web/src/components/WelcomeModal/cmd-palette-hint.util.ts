import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { getModifierKeyLabel } from "@web/shortcuts/shortcut.util";

const CMD_PALETTE_HINT_TOAST_ID = "cmd-palette-hint";

export function hasSeenCmdPaletteHint(): boolean {
  if (!persistentBrowserStore.isAvailable()) return true;
  return (
    persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_CMD_PALETTE_HINT) ===
    "true"
  );
}

export function markCmdPaletteHintSeen(): void {
  persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_CMD_PALETTE_HINT, "true");
}

export function maybeShowCmdPaletteHint(): void {
  if (hasSeenCmdPaletteHint()) return;

  markCmdPaletteHintSeen();
  const modKey = getModifierKeyLabel();
  showStatusToast(
    CMD_PALETTE_HINT_TOAST_ID,
    `Press ${modKey}+K for commands — create events, connect Google, switch views`,
  );
}
