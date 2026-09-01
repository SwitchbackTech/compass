import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export type FirstEventDoneReason = "completed" | "dismissed";

/**
 * Users who finished or dismissed the retired checklist wrote this key;
 * honor it so an established user who already activated (or already said no)
 * never sees the prompt. Deliberately outside the typed StorageKey union: the
 * key is dead except for this one read.
 */
const LEGACY_CHECKLIST_DONE_KEY =
  "compass.onboarding.checklist-done" as (typeof STORAGE_KEYS)["FIRST_EVENT_DONE"];

/**
 * The retired guided tour's seen key marks established pre-showcase users.
 * showcase.storage.ts honors it as "has seen the showcase", which alone would
 * qualify that cohort for this prompt — on a calendar already full of events.
 * Anyone holding the key predates the prompt, so treat them as done too.
 */
const LEGACY_TOUR_SEEN_KEY = "compass.onboarding.has-seen-onboarding-tour";

export function getFirstEventDone(): FirstEventDoneReason | null {
  if (!persistentBrowserStore.isAvailable()) return null;
  const value = persistentBrowserStore.get(STORAGE_KEYS.FIRST_EVENT_DONE);
  if (value === "completed" || value === "dismissed") return value;
  const legacy = persistentBrowserStore.get(LEGACY_CHECKLIST_DONE_KEY);
  if (legacy === "completed" || legacy === "dismissed") return legacy;
  const sawTour = persistentBrowserStore.get(LEGACY_TOUR_SEEN_KEY) === "true";
  return sawTour ? "completed" : null;
}

export function markFirstEventDone(reason: FirstEventDoneReason): void {
  persistentBrowserStore.set(STORAGE_KEYS.FIRST_EVENT_DONE, reason);
}
