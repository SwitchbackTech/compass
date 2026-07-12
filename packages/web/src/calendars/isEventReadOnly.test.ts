import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import {
  buildCalendarLookup,
  isEventReadOnly,
} from "@web/calendars/useCalendarLookup";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { describe, expect, it } from "bun:test";

// Pure unit coverage for the shared read-only rule (packet 08 step 8) - the
// component-level tests (grid cards, shortcuts, context menu, form) each
// exercise this indirectly, but the rule itself is small enough to pin down
// directly: writable calendar -> false, unwritable -> true, busy content
// forces true regardless, and a lookup gap fails open.

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Test calendar",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "owner",
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: false,
  isVisible: true,
  isActive: true,
  ...overrides,
});

describe("isEventReadOnly", () => {
  it("is writable for an event on an owner calendar", () => {
    const calendar = makeCalendar({ access: "owner" });
    const lookup = buildCalendarLookup([calendar]);

    expect(isEventReadOnly(lookup, calendar.id, false)).toBe(false);
  });

  it("is writable for an event on a writer calendar", () => {
    const calendar = makeCalendar({
      access: "writer",
      capabilities: getCalendarCapabilities("writer"),
    });
    const lookup = buildCalendarLookup([calendar]);

    expect(isEventReadOnly(lookup, calendar.id, false)).toBe(false);
  });

  it("is read-only for an event on a reader calendar", () => {
    const calendar = makeCalendar({
      access: "reader",
      capabilities: getCalendarCapabilities("reader"),
    });
    const lookup = buildCalendarLookup([calendar]);

    expect(isEventReadOnly(lookup, calendar.id, false)).toBe(true);
  });

  it("is read-only for an event on a freeBusyReader calendar", () => {
    const calendar = makeCalendar({
      access: "freeBusyReader",
      capabilities: getCalendarCapabilities("freeBusyReader"),
    });
    const lookup = buildCalendarLookup([calendar]);

    expect(isEventReadOnly(lookup, calendar.id, false)).toBe(true);
  });

  it("forces read-only for busy content regardless of calendar capability", () => {
    const calendar = makeCalendar({ access: "owner" });
    const lookup = buildCalendarLookup([calendar]);

    expect(isEventReadOnly(lookup, calendar.id, true)).toBe(true);
  });

  it("fails open (writable) when the calendarId is missing", () => {
    const lookup = buildCalendarLookup([makeCalendar()]);

    expect(isEventReadOnly(lookup, undefined, false)).toBe(false);
    expect(isEventReadOnly(lookup, null, false)).toBe(false);
  });

  it("fails open (writable) when the calendarId doesn't resolve in the lookup", () => {
    const lookup = buildCalendarLookup([makeCalendar()]);
    const unknownId = CalendarIdSchema.parse(createObjectIdString());

    expect(isEventReadOnly(lookup, unknownId, false)).toBe(false);
  });

  it("fails open (writable) when the calendars query hasn't loaded yet", () => {
    const lookup = buildCalendarLookup(undefined);
    const someId = CalendarIdSchema.parse(createObjectIdString());

    expect(isEventReadOnly(lookup, someId, false)).toBe(false);
  });
});
