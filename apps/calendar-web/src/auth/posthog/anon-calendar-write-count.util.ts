import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

/** Founder decision (Trial v2 WP-03): nudge after this many anonymous calendar writes. */
export const ANONYMOUS_CALENDAR_WRITE_NUDGE_COUNT = 3;

export function readAnonymousCalendarWriteCount(): number {
  if (!persistentBrowserStore.isAvailable()) return 0;
  const raw = persistentBrowserStore.get(
    STORAGE_KEYS.ANONYMOUS_CALENDAR_WRITE_COUNT,
  );
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function incrementAnonymousCalendarWriteCount(): number {
  if (!persistentBrowserStore.isAvailable()) return 0;
  const next = readAnonymousCalendarWriteCount() + 1;
  persistentBrowserStore.set(
    STORAGE_KEYS.ANONYMOUS_CALENDAR_WRITE_COUNT,
    String(next),
  );
  return next;
}
