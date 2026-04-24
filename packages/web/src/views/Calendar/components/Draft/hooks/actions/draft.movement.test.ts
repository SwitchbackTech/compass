import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import {
  getDraggedEventDateRange,
  getIsValidResizeMovement,
} from "./draft.movement";
import { describe, expect, it } from "bun:test";

describe("draft movement helpers", () => {
  it("caps timed drag ranges at midnight when the end would overflow", () => {
    const start = dayjs("2024-01-15T23:45:00.000Z");

    const result = getDraggedEventDateRange({
      eventStart: start,
      durationMin: 60,
      isAllDay: false,
    });

    expect(dayjs(result.startDate).date()).toBe(15);
    expect(dayjs(result.endDate).hour()).toBe(0);
    expect(dayjs(result.endDate).minute()).toBe(0);
  });

  it("formats all-day drag ranges as date-only values", () => {
    const start = dayjs("2024-01-15T09:00:00.000Z");

    const result = getDraggedEventDateRange({
      eventStart: start,
      durationMin: 1440,
      isAllDay: true,
    });

    expect(result.startDate).toBe(start.format(YEAR_MONTH_DAY_FORMAT));
    expect(result.endDate).toBe(
      start.add(1440, "minutes").format(YEAR_MONTH_DAY_FORMAT),
    );
  });

  it("rejects resize movement that changes a timed event to another day", () => {
    expect(
      getIsValidResizeMovement({
        currTime: dayjs("2024-01-16T10:00:00.000Z"),
        draftStartDate: "2024-01-15T09:00:00.000Z",
        currentValue: "2024-01-15T10:00:00.000Z",
        dateBeingChanged: "endDate",
        isAllDay: false,
      }),
    ).toBe(false);
  });
});
