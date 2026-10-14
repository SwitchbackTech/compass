import { getCalendarCapabilities } from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  providerManagedRecurrenceToast,
  providerManagedScheduleToast,
} from "@web/views/Forms/EventForm/provider-managed-field.util";
import { describe, expect, it } from "bun:test";

const calendar = (provider: "google" | "microsoft" | "apple") => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Cal",
  description: "",
  timeZone: null,
  foregroundColor: "#000",
  backgroundColor: "#fff",
  provider,
  access: "owner" as const,
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: true,
  isVisible: true,
  isActive: true,
});

describe("providerManagedScheduleToast", () => {
  it("names Google Calendar, Outlook, and iCloud Calendar", () => {
    expect(providerManagedScheduleToast(calendar("google"))).toBe(
      "This time is managed by Google Calendar.",
    );
    expect(providerManagedScheduleToast(calendar("microsoft"))).toBe(
      "This time is managed by Outlook.",
    );
    expect(providerManagedRecurrenceToast(calendar("apple"))).toBe(
      "Recurrence is managed by iCloud Calendar.",
    );
  });

  // The lookup returns undefined while the calendars query is still in flight;
  // naming a provider there would attribute the lock to the wrong product.
  it("falls back to the generic sentence when the calendar is unknown", () => {
    expect(providerManagedScheduleToast(undefined)).toBe(
      "This time is managed by your calendar and can't be edited here.",
    );
    expect(providerManagedRecurrenceToast(undefined)).toBe(
      "Recurrence is managed by your calendar and can't be edited here.",
    );
  });
});
