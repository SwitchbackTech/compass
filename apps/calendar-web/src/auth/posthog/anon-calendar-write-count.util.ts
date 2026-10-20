import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

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
