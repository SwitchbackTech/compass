import { useSyncExternalStore } from "react";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import { createExternalStore } from "@web/common/utils/external-store.util";

/**
 * Part I: the effective timezone is always the browser zone (Auto). Part II
 * will pin a user choice on top of this store; until then, subscribers still
 * need a live value so the corner label can update without a reload.
 */
const effectiveTimeZoneStore = createExternalStore(getBrowserTimeZone());

export function getEffectiveTimeZone(): string {
  return effectiveTimeZoneStore.get();
}

export function refreshEffectiveTimeZoneFromBrowser(): void {
  effectiveTimeZoneStore.set(getBrowserTimeZone());
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshEffectiveTimeZoneFromBrowser();
    }
  });
}

export function useEffectiveTimeZone(): string {
  return useSyncExternalStore(
    effectiveTimeZoneStore.subscribe,
    effectiveTimeZoneStore.get,
  );
}

/** Test-only: set the in-memory effective zone without persistence. */
export function setEffectiveTimeZoneForTests(timeZone: string): void {
  effectiveTimeZoneStore.set(timeZone);
}

export function resetEffectiveTimeZoneStoreForTests(): void {
  refreshEffectiveTimeZoneFromBrowser();
}
