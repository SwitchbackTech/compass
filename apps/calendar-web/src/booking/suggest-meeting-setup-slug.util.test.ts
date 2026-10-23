import { BookingSlugSchema } from "@core/types/booking.contracts";
import { suggestGuestMeetingSetupSlug } from "@web/booking/suggest-meeting-setup-slug.util";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("suggestGuestMeetingSetupSlug", () => {
  beforeEach(() => {
    persistentBrowserStore.remove(STORAGE_KEYS.GUEST_MEETING_SETUP_SLUG_SEED);
  });

  it("returns a valid slug and keeps it stable for this browser", () => {
    const first = suggestGuestMeetingSetupSlug();
    const second = suggestGuestMeetingSetupSlug();

    expect(BookingSlugSchema.safeParse(first).success).toBe(true);
    expect(second).toBe(first);
  });
});
