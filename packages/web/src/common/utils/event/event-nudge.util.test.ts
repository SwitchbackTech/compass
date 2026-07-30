import dayjs from "@core/util/date/dayjs";
import {
  getArrowKeyMovement,
  isTimedEventFullCalendarDay,
  isTimedEventInsideOneDay,
  isTimedEventMultiDay,
  nudgeEventDates,
  shouldRenderTimedInAllDayRow,
  timedMultiDayToAllDayDates,
} from "@web/common/utils/event/event-nudge.util";
import { GRID_TIME_STEP } from "@web/grid/grid.constants";
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
      minutes: -GRID_TIME_STEP,
    });
    expect(getArrowKeyMovement("ArrowDown", false)).toEqual({
      days: 0,
      minutes: GRID_TIME_STEP,
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

describe("isTimedEventMultiDay", () => {
  it("is false for same-day timed events and exact next-midnight ends", () => {
    expect(
      isTimedEventMultiDay(
        dayjs("2026-05-20T10:00:00"),
        dayjs("2026-05-20T11:00:00"),
      ),
    ).toBe(false);
    expect(
      isTimedEventInsideOneDay(
        dayjs("2026-05-20T22:00:00"),
        dayjs("2026-05-21T00:00:00"),
      ),
    ).toBe(true);
    expect(
      isTimedEventMultiDay(
        dayjs("2026-05-20T22:00:00"),
        dayjs("2026-05-21T00:00:00"),
      ),
    ).toBe(false);
  });

  it("is true for overnight and multi-day timed ranges", () => {
    expect(
      isTimedEventMultiDay(
        dayjs("2026-05-20T22:00:00"),
        dayjs("2026-05-21T02:00:00"),
      ),
    ).toBe(true);
    expect(
      isTimedEventMultiDay(
        dayjs("2026-05-20T08:00:00"),
        dayjs("2026-05-21T18:00:00"),
      ),
    ).toBe(true);
  });
});

describe("isTimedEventFullCalendarDay", () => {
  it("is true for midnight to next midnight", () => {
    expect(
      isTimedEventFullCalendarDay(
        dayjs("2026-05-20T00:00:00"),
        dayjs("2026-05-21T00:00:00"),
      ),
    ).toBe(true);
  });

  it("is false for evening events that end at next midnight", () => {
    expect(
      isTimedEventFullCalendarDay(
        dayjs("2026-05-20T22:00:00"),
        dayjs("2026-05-21T00:00:00"),
      ),
    ).toBe(false);
  });

  it("is false for same-day timed and overnight multi-day ranges", () => {
    expect(
      isTimedEventFullCalendarDay(
        dayjs("2026-05-20T10:00:00"),
        dayjs("2026-05-20T11:00:00"),
      ),
    ).toBe(false);
    expect(
      isTimedEventFullCalendarDay(
        dayjs("2026-05-20T22:00:00"),
        dayjs("2026-05-21T02:00:00"),
      ),
    ).toBe(false);
  });
});

describe("shouldRenderTimedInAllDayRow", () => {
  it("promotes full-calendar-day timed events and multi-day timed events", () => {
    expect(
      shouldRenderTimedInAllDayRow(
        dayjs("2026-05-20T00:00:00"),
        dayjs("2026-05-21T00:00:00"),
      ),
    ).toBe(true);
    expect(
      shouldRenderTimedInAllDayRow(
        dayjs("2026-05-20T22:00:00"),
        dayjs("2026-05-21T02:00:00"),
      ),
    ).toBe(true);
  });

  it("keeps evening-to-midnight and same-day timed events in the timed grid", () => {
    expect(
      shouldRenderTimedInAllDayRow(
        dayjs("2026-05-20T22:00:00"),
        dayjs("2026-05-21T00:00:00"),
      ),
    ).toBe(false);
    expect(
      shouldRenderTimedInAllDayRow(
        dayjs("2026-05-20T10:00:00"),
        dayjs("2026-05-20T11:00:00"),
      ),
    ).toBe(false);
  });
});

describe("timedMultiDayToAllDayDates", () => {
  it("maps a Fri–Sat timed range to an exclusive Fri–Sun all-day span", () => {
    expect(
      timedMultiDayToAllDayDates(
        dayjs("2026-05-22T08:00:00"),
        dayjs("2026-05-23T18:00:00"),
      ),
    ).toEqual({ startDate: "2026-05-22", endDate: "2026-05-24" });
  });

  it("does not include the day after a midnight-exclusive end", () => {
    expect(
      timedMultiDayToAllDayDates(
        dayjs("2026-05-22T08:00:00"),
        dayjs("2026-05-25T00:00:00"),
      ),
    ).toEqual({ startDate: "2026-05-22", endDate: "2026-05-25" });
  });
});
