import { CALENDAR_GRID_TIME_STEP } from "@web/common/calendar-grid/calendarGrid.constants";
import {
  getArrowKeyMovement,
  nudgeEventDates,
} from "@web/common/utils/event/event-nudge.util";
import { describe, expect, it } from "bun:test";

describe("getArrowKeyMovement", () => {
  it("maps left/right to day moves for timed and all-day events", () => {
    expect(getArrowKeyMovement("ArrowLeft", false)).toEqual({
      days: -1,
      minutes: 0,
    });
    expect(getArrowKeyMovement("ArrowRight", true)).toEqual({
      days: 1,
      minutes: 0,
    });
  });

  it("maps up/down to 15-minute moves for timed events", () => {
    expect(getArrowKeyMovement("ArrowUp", false)).toEqual({
      days: 0,
      minutes: -CALENDAR_GRID_TIME_STEP,
    });
    expect(getArrowKeyMovement("ArrowDown", false)).toEqual({
      days: 0,
      minutes: CALENDAR_GRID_TIME_STEP,
    });
  });

  it("returns null for up/down on all-day events and unknown keys", () => {
    expect(getArrowKeyMovement("ArrowUp", true)).toBeNull();
    expect(getArrowKeyMovement("ArrowDown", true)).toBeNull();
    expect(getArrowKeyMovement("Enter", false)).toBeNull();
  });
});

describe("nudgeEventDates", () => {
  const timedEvent = {
    startDate: "2026-05-20T10:00:00",
    endDate: "2026-05-20T11:00:00",
    isAllDay: false,
  };

  it("moves a timed event by 15 minutes", () => {
    const result = nudgeEventDates(timedEvent, { days: 0, minutes: 15 });

    expect(result).not.toBeNull();
    expect(result?.startDate).toStartWith("2026-05-20T10:15:00");
    expect(result?.endDate).toStartWith("2026-05-20T11:15:00");
  });

  it("moves a timed event by a day", () => {
    const result = nudgeEventDates(timedEvent, { days: 1, minutes: 0 });

    expect(result?.startDate).toStartWith("2026-05-21T10:00:00");
    expect(result?.endDate).toStartWith("2026-05-21T11:00:00");
  });

  it("returns null when moving up would cross into the previous day", () => {
    const result = nudgeEventDates(
      {
        startDate: "2026-05-20T00:00:00",
        endDate: "2026-05-20T01:00:00",
        isAllDay: false,
      },
      { days: 0, minutes: -15 },
    );

    expect(result).toBeNull();
  });

  it("allows moving down until the end lands exactly on midnight", () => {
    const onMidnight = nudgeEventDates(
      {
        startDate: "2026-05-20T23:00:00",
        endDate: "2026-05-20T23:45:00",
        isAllDay: false,
      },
      { days: 0, minutes: 15 },
    );
    expect(onMidnight?.endDate).toStartWith("2026-05-21T00:00:00");

    const pastMidnight = nudgeEventDates(
      {
        startDate: "2026-05-20T23:15:00",
        endDate: "2026-05-21T00:00:00",
        isAllDay: false,
      },
      { days: 0, minutes: 15 },
    );
    expect(pastMidnight).toBeNull();
  });

  it("keeps YYYY-MM-DD format for all-day day moves", () => {
    const result = nudgeEventDates(
      { startDate: "2026-05-20", endDate: "2026-05-21", isAllDay: true },
      { days: -1, minutes: 0 },
    );

    expect(result).toEqual({ startDate: "2026-05-19", endDate: "2026-05-20" });
  });

  it("returns null for minute moves on all-day events", () => {
    const result = nudgeEventDates(
      { startDate: "2026-05-20", endDate: "2026-05-21", isAllDay: true },
      { days: 0, minutes: 15 },
    );

    expect(result).toBeNull();
  });
});
