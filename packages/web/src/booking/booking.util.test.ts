import { CalendarIdSchema } from "@core/types/domain-primitives";
import { createMockCalendar } from "@web/__tests__/utils/factories/calendar.factory";
import { defaultBlockingCalendarIdsForDestination } from "@web/booking/booking.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { describe, expect, it } from "bun:test";

const calendarId = () => CalendarIdSchema.parse(createObjectIdString());

describe("defaultBlockingCalendarIdsForDestination", () => {
  it("includes Compass alongside the destination account's calendars", () => {
    const workId = calendarId();
    const personalId = calendarId();
    const compassId = calendarId();
    const work = createMockCalendar({
      id: workId,
      name: "Work",
      accountEmail: "host@example.com",
    });
    const personal = createMockCalendar({
      id: personalId,
      name: "Personal",
      accountEmail: "other@example.com",
    });
    const compass = createMockCalendar({
      id: compassId,
      name: "Compass",
      provider: "local",
    });

    expect(
      defaultBlockingCalendarIdsForDestination(workId, [
        work,
        personal,
        compass,
      ]),
    ).toEqual([workId, compassId]);
  });

  it("still includes Compass when the destination has no account email", () => {
    const destinationId = calendarId();
    const compassId = calendarId();
    const destination = createMockCalendar({
      id: destinationId,
      name: "Work",
    });
    const compass = createMockCalendar({
      id: compassId,
      name: "Compass",
      provider: "local",
    });

    expect(
      defaultBlockingCalendarIdsForDestination(destinationId, [
        destination,
        compass,
      ]),
    ).toEqual([destinationId, compassId]);
  });

  it("does not duplicate Compass when it is already in the blocking set", () => {
    const compassId = calendarId();
    const compass = createMockCalendar({
      id: compassId,
      name: "Compass",
      provider: "local",
    });

    expect(
      defaultBlockingCalendarIdsForDestination(compassId, [compass]),
    ).toEqual([compassId]);
  });
});
