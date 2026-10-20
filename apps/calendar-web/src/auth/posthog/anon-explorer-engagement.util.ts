import { readAnonymousCalendarWriteCount } from "@web/auth/posthog/anon-calendar-write-count.util";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

/** One genuine calendar write is enough to nudge signup. */
export const ANONYMOUS_EXPLORER_WRITE_ENGAGEMENT_COUNT = 1;

/** A few handled shortcuts without a write still counts as engaged. */
export const ANONYMOUS_EXPLORER_SHORTCUT_ENGAGEMENT_COUNT = 5;

function readCount(storageKey: string): number {
  if (!persistentBrowserStore.isAvailable()) return 0;
  const raw = persistentBrowserStore.get(storageKey);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function readAnonymousShortcutEngagementCount(): number {
  return readCount(STORAGE_KEYS.ANONYMOUS_SHORTCUT_ENGAGEMENT_COUNT);
}

export function incrementAnonymousShortcutEngagementCount(): number {
  if (!persistentBrowserStore.isAvailable()) return 0;
  const next = readAnonymousShortcutEngagementCount() + 1;
  persistentBrowserStore.set(
    STORAGE_KEYS.ANONYMOUS_SHORTCUT_ENGAGEMENT_COUNT,
    String(next),
  );
  return next;
}

export function isAnonymousExplorerEngaged(
  writeCount = readAnonymousCalendarWriteCount(),
  shortcutCount = readAnonymousShortcutEngagementCount(),
): boolean {
  return (
    writeCount >= ANONYMOUS_EXPLORER_WRITE_ENGAGEMENT_COUNT ||
    shortcutCount >= ANONYMOUS_EXPLORER_SHORTCUT_ENGAGEMENT_COUNT
  );
}

/** Shortcut-only explorers get the sign-up nudge instead of the first-event card. */
export function shouldDeferFirstEventPromptForSignUpNudge(
  writeCount = readAnonymousCalendarWriteCount(),
  shortcutCount = readAnonymousShortcutEngagementCount(),
): boolean {
  return (
    writeCount < ANONYMOUS_EXPLORER_WRITE_ENGAGEMENT_COUNT &&
    shortcutCount >= ANONYMOUS_EXPLORER_SHORTCUT_ENGAGEMENT_COUNT
  );
}
