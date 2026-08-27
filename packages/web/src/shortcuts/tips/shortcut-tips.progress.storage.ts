import { z } from "zod/v4";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  isShortcutHintId,
  type ShortcutHintId,
} from "@web/shortcuts/tips/shortcut-tips.data";

// Most-recent-last list of demonstrated tip ids. Rotation uses the last
// entry; unused picks ignore order.
const DemonstratedIdsSchema = z.array(z.string()).readonly();

export function readShortcutHintProgress(): readonly ShortcutHintId[] {
  const raw = persistentBrowserStore.get(
    STORAGE_KEYS.SHORTCUT_TIPS_DEMONSTRATED,
  );
  if (!raw) return [];

  try {
    return DemonstratedIdsSchema.parse(JSON.parse(raw)).filter(
      isShortcutHintId,
    );
  } catch {
    return [];
  }
}

export function writeShortcutHintProgress(
  ids: readonly ShortcutHintId[],
): boolean {
  if (ids.length === 0) {
    return persistentBrowserStore.remove(
      STORAGE_KEYS.SHORTCUT_TIPS_DEMONSTRATED,
    );
  }
  return persistentBrowserStore.set(
    STORAGE_KEYS.SHORTCUT_TIPS_DEMONSTRATED,
    JSON.stringify(ids),
  );
}
