import { TimeZoneSchema } from "@core/types/domain-primitives";
import { createMockCalendar } from "@web/__tests__/utils/factories/calendar.factory";
import { pickCalendarTimeZoneHint } from "@web/timezone/calendar-timezone-hint";
import { describe, expect, it } from "bun:test";

describe("pickCalendarTimeZoneHint", () => {
  it("prefers the primary calendar zone", () => {
    const calendars = [
      createMockCalendar({
        name: "Work",
        timeZone: TimeZoneSchema.parse("America/New_York"),
        isPrimary: true,
      }),
      createMockCalendar({
        name: "Other",
        timeZone: TimeZoneSchema.parse("America/Denver"),
        isPrimary: false,
      }),
    ];
    expect(pickCalendarTimeZoneHint(calendars)).toBe("America/New_York");
  });

  it("skips UTC when another calendar has a regional zone", () => {
    const calendars = [
      createMockCalendar({
        name: "UTC cal",
        timeZone: TimeZoneSchema.parse("UTC"),
        isPrimary: false,
      }),
      createMockCalendar({
        name: "Denver",
        timeZone: TimeZoneSchema.parse("America/Denver"),
        isPrimary: false,
      }),
    ];
    expect(pickCalendarTimeZoneHint(calendars)).toBe("America/Denver");
  });
});
