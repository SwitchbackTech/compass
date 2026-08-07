import { EventScheduleSchema } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { eventMatchesRange } from "@web/events/queries/event.query.normalize";
import { WEEK_DAY_COUNT } from "@web/views/Week/util/week-window.util";
import { describe, expect, it } from "bun:test";

const DATE_FORMAT = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

const lastDayAllDay = () =>
  createMockEvent({
    schedule: EventScheduleSchema.parse({
      kind: "allDay",
      start: "2026-08-12",
      end: "2026-08-13",
    }),
  });

describe("eventMatchesRange", () => {
  it("includes a last-day all-day event when the range end is next midnight", () => {
    const start = dayjs("2026-08-06", DATE_FORMAT).startOf("day");
    const end = start.add(WEEK_DAY_COUNT, "day").startOf("day");

    expect(
      eventMatchesRange(lastDayAllDay(), start.format(), end.format()),
    ).toBe(true);
  });

  it("excludes a last-day all-day event when the range end is endOf(day)", () => {
    const start = dayjs("2026-08-06", DATE_FORMAT).startOf("day");
    const end = start.add(WEEK_DAY_COUNT - 1, "day").endOf("day");

    expect(
      eventMatchesRange(lastDayAllDay(), start.format(), end.format()),
    ).toBe(false);
  });
});
