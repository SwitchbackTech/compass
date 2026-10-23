import { allocateBookingSlug } from "@core/types/booking.contracts";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

const getOrCreateGuestSlugSeed = (): string => {
  const existing = persistentBrowserStore.get(
    STORAGE_KEYS.GUEST_MEETING_SETUP_SLUG_SEED,
  );
  if (existing != null && existing.length >= 6) {
    return existing;
  }
  const seed = crypto.randomUUID().replace(/-/g, "").slice(-12);
  persistentBrowserStore.set(STORAGE_KEYS.GUEST_MEETING_SETUP_SLUG_SEED, seed);
  return seed;
};

/**
 * URL-safe meeting address for signed-out setup preview. Stable for this
 * browser so a reload keeps the same suggestion until the host edits it.
 */
export function suggestGuestMeetingSetupSlug(): string {
  return allocateBookingSlug("", "", getOrCreateGuestSlugSeed(), new Set());
}
