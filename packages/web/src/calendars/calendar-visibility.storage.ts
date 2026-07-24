import { z } from "zod";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

// Hidden calendar ids only — absence means visible (default). A Set of
// ObjectId-shaped strings; unknown / malformed storage falls back to empty
// (everything visible) rather than locking the user out of every calendar.
const HiddenCalendarIdsSchema = z.array(z.string().trim().min(1)).readonly();

export function readHiddenCalendarIds(): ReadonlySet<string> {
  const raw = persistentBrowserStore.get(STORAGE_KEYS.HIDDEN_CALENDAR_IDS);
  if (!raw) return new Set();

  try {
    return new Set(HiddenCalendarIdsSchema.parse(JSON.parse(raw)));
  } catch {
    return new Set();
  }
}

export function writeHiddenCalendarIds(ids: ReadonlySet<string>): boolean {
  if (ids.size === 0) {
    return persistentBrowserStore.remove(STORAGE_KEYS.HIDDEN_CALENDAR_IDS);
  }
  return persistentBrowserStore.set(
    STORAGE_KEYS.HIDDEN_CALENDAR_IDS,
    JSON.stringify([...ids]),
  );
}

export function setCalendarHidden(
  calendarId: string,
  hidden: boolean,
): boolean {
  const next = new Set(readHiddenCalendarIds());
  if (hidden) next.add(calendarId);
  else next.delete(calendarId);
  return writeHiddenCalendarIds(next);
}

export function isCalendarHidden(calendarId: string): boolean {
  return readHiddenCalendarIds().has(calendarId);
}
