import { z } from "zod/v4";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export const MAX_RECENT_COMMANDS = 8;

// Most-recent-first list of command ids. Malformed or missing storage falls
// back to an empty list rather than surfacing an error.
const RecentCommandsSchema = z.array(z.string().trim().min(1)).readonly();

export function readRecentCommandIds(): readonly string[] {
  const raw = persistentBrowserStore.get(STORAGE_KEYS.RECENT_COMMANDS);
  if (!raw) return [];

  try {
    return RecentCommandsSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Callers are responsible for capping — this writes exactly what it's given. */
export function writeRecentCommandIds(ids: readonly string[]): boolean {
  if (ids.length === 0) {
    return persistentBrowserStore.remove(STORAGE_KEYS.RECENT_COMMANDS);
  }
  return persistentBrowserStore.set(
    STORAGE_KEYS.RECENT_COMMANDS,
    JSON.stringify(ids),
  );
}
