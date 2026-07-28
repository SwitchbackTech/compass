import { useSyncExternalStore } from "react";
import { type CalendarId } from "@core/types/domain-primitives";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { createExternalStore } from "@web/common/utils/external-store.util";
import {
  readHiddenCalendarIds,
  setCalendarHidden,
} from "./calendar-visibility.storage";

/**
 * Reactive mirror of the client-owned hidden-calendar-id set (S39 A2
 * follow-up). Storage (calendar-visibility.storage.ts) stays the source of
 * truth; this store just makes a change to it observable, so the calendars
 * query's `select` (calendar.query.ts) can derive isVisible on every read
 * instead of relying on whichever writer last hand-patched the query cache.
 * Any future writer of the calendars cache (SSE upsert, rename/color
 * mutation, test seeding) gets the overlay for free - there's nothing left
 * to remember to re-run.
 */
const hiddenIdsStore = createExternalStore<ReadonlySet<string>>(
  readHiddenCalendarIds(),
);

function refreshFromStorage(): void {
  hiddenIdsStore.set(readHiddenCalendarIds());
}

/**
 * Persist + broadcast a visibility change. Returns false (and leaves the
 * store untouched) when the storage write fails, so callers can surface a
 * failure toast without the UI silently flipping first.
 */
export function setCalendarVisibility(
  calendarId: CalendarId,
  isVisible: boolean,
): boolean {
  const saved = setCalendarHidden(calendarId, !isVisible);
  if (saved) refreshFromStorage();
  return saved;
}

function subscribe(onChange: () => void): () => void {
  const unsubscribeStore = hiddenIdsStore.subscribe(onChange);

  if (typeof window === "undefined") return unsubscribeStore;

  // Cross-tab sync: a write in another tab fires "storage" here (never in
  // the writing tab itself), so pick it up and re-read localStorage.
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.HIDDEN_CALENDAR_IDS) {
      refreshFromStorage();
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    unsubscribeStore();
    window.removeEventListener("storage", handleStorage);
  };
}

export function useHiddenCalendarIds(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, hiddenIdsStore.get);
}

/**
 * Test-only: resyncs the in-memory store from storage. Without this, the
 * module-singleton store keeps a hidden id in memory even after a test
 * clears localStorage directly, leaking into later tests in the same file.
 */
export function resetCalendarVisibilityStoreForTests(): void {
  refreshFromStorage();
}
