import { z } from "zod/v4";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  isShortcutHintId,
  type ShortcutHintId,
} from "@web/shortcuts/tips/shortcut-tips.data";

export type ShortcutHintProgress = {
  demonstratedIds: readonly ShortcutHintId[];
  lastUsedId: ShortcutHintId | null;
};

export const EMPTY_SHORTCUT_HINT_PROGRESS: ShortcutHintProgress = {
  demonstratedIds: [],
  lastUsedId: null,
};

const ProgressSchema = z.object({
  demonstratedIds: z.array(z.string()),
  lastUsedId: z.string().nullable(),
});

export function readShortcutHintProgress(): ShortcutHintProgress {
  const raw = persistentBrowserStore.get(
    STORAGE_KEYS.SHORTCUT_TIPS_DEMONSTRATED,
  );
  if (!raw) return EMPTY_SHORTCUT_HINT_PROGRESS;

  try {
    const parsed = ProgressSchema.parse(JSON.parse(raw));
    const demonstratedIds = parsed.demonstratedIds.filter(isShortcutHintId);
    const lastUsedId =
      parsed.lastUsedId && isShortcutHintId(parsed.lastUsedId)
        ? parsed.lastUsedId
        : null;
    return { demonstratedIds, lastUsedId };
  } catch {
    return EMPTY_SHORTCUT_HINT_PROGRESS;
  }
}

export function writeShortcutHintProgress(
  progress: ShortcutHintProgress,
): boolean {
  if (progress.demonstratedIds.length === 0 && progress.lastUsedId === null) {
    return persistentBrowserStore.remove(
      STORAGE_KEYS.SHORTCUT_TIPS_DEMONSTRATED,
    );
  }
  return persistentBrowserStore.set(
    STORAGE_KEYS.SHORTCUT_TIPS_DEMONSTRATED,
    JSON.stringify(progress),
  );
}
