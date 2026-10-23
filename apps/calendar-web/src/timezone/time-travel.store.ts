import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { createStorageBackedStore } from "@web/common/utils/external-store.util";
import {
  getBrowserTimeZone,
  isValidTimeZone,
} from "@web/timezone/browser-timezone";
import { isUtcLikeTimeZone } from "@web/timezone/utc-like-timezone";

function readTimeTravelZone(): string | null {
  const raw = persistentBrowserStore.get(STORAGE_KEYS.TIME_TRAVEL_TIMEZONE);
  if (!raw || raw.trim().length === 0 || !isValidTimeZone(raw)) {
    return null;
  }
  return raw;
}

const timeTravelZoneStore = createStorageBackedStore<string | null>(
  STORAGE_KEYS.TIME_TRAVEL_TIMEZONE,
  readTimeTravelZone,
);

export function getTimeTravelZone(): string | null {
  return timeTravelZoneStore.get();
}

/**
 * Pin a secondary read-only hour column, or pass null to dismiss it.
 * Returns false when the storage write fails, leaving the previous zone.
 */
export function setTimeTravelZone(timeZone: string | null): boolean {
  if (timeZone !== null && !isValidTimeZone(timeZone)) {
    return false;
  }

  const saved =
    timeZone === null
      ? persistentBrowserStore.remove(STORAGE_KEYS.TIME_TRAVEL_TIMEZONE)
      : persistentBrowserStore.set(STORAGE_KEYS.TIME_TRAVEL_TIMEZONE, timeZone);

  if (saved) {
    timeTravelZoneStore.set(timeZone);
  }
  return saved;
}

export function useTimeTravelZone(): string | null {
  return useSyncExternalStore(timeTravelZoneStore.subscribe, getTimeTravelZone);
}

export function resetTimeTravelStoreForTests(): void {
  persistentBrowserStore.remove(STORAGE_KEYS.TIME_TRAVEL_TIMEZONE);
  timeTravelZoneStore.set(null);
}

function readPinnedTimeZoneFromStorage(): string | null {
  const raw = persistentBrowserStore.get(STORAGE_KEYS.DEFAULT_TIMEZONE);
  if (!raw || !isValidTimeZone(raw)) {
    return null;
  }
  return raw;
}

/** Drop a UTC second column when the device zone is an unreliable UTC spoof. */
export function repairAccidentalUtcTimeTravelZone(): void {
  const travel = getTimeTravelZone();
  if (travel === null || !isUtcLikeTimeZone(travel)) {
    return;
  }
  if (!isUtcLikeTimeZone(getBrowserTimeZone())) {
    return;
  }
  const pinned = readPinnedTimeZoneFromStorage();
  if (pinned !== null && !isUtcLikeTimeZone(pinned)) {
    setTimeTravelZone(null);
  }
}
