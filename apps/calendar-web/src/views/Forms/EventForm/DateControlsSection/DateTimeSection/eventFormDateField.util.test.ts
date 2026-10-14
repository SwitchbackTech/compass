import dayjs from "@core/util/date/dayjs";
import { getTimeOptionByValue } from "@web/common/utils/datetime/web.date.util";
import {
  shiftTimedScheduleByDays,
  timedScheduleFromDateChange,
} from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/eventFormDateField.util";
import { describe, expect, it } from "bun:test";

describe("shiftTimedScheduleByDays", () => {
  it("preserves duration when shifting both instants", () => {
    const start = new Date("2026-04-24T14:00:00.000Z");
    const end = new Date("2026-04-24T15:00:00.000Z");
    const shifted = shiftTimedScheduleByDays(start, end, 2);
    expect(dayjs(shifted.end).diff(shifted.start, "minute")).toBe(60);
  });
});

describe("timedScheduleFromDateChange", () => {
  const start = new Date("2026-04-24T14:00:00.000Z");
  const end = new Date("2026-04-24T15:00:00.000Z");
  const startTime = getTimeOptionByValue(dayjs(start));
  const endTime = getTimeOptionByValue(dayjs(end));

  it("moves the event when the start date changes", () => {
    const mapped = timedScheduleFromDateChange({
      changed: "start",
      nextDate: dayjs(start).add(1, "day").toDate(),
      selectedStartDate: start,
      startTime,
      endTime,
      scheduleStart: start,
      scheduleEnd: end,
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok || mapped.schedule.kind !== "timed") return;
    expect(
      dayjs(mapped.schedule.end).diff(mapped.schedule.start, "minute"),
    ).toBe(60);
    expect(dayjs(mapped.schedule.start).date()).toBe(25);
  });

  it("keeps the start instant when only the end date changes", () => {
    const mapped = timedScheduleFromDateChange({
      changed: "end",
      nextDate: dayjs(start).add(1, "day").toDate(),
      selectedStartDate: start,
      startTime,
      endTime,
      scheduleStart: start,
      scheduleEnd: end,
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok || mapped.schedule.kind !== "timed") return;
    expect(dayjs(mapped.schedule.start).toISOString()).toBe(
      start.toISOString(),
    );
    expect(dayjs(mapped.schedule.end).date()).toBe(25);
  });
});
