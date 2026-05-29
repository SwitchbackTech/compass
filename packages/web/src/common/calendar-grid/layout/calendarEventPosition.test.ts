import dayjs from "@core/util/date/dayjs";
import {
  getCalendarAllDayEventPosition,
  getCalendarTimedEventPosition,
} from "./calendarEventPosition";
import { describe, expect, it } from "bun:test";

const measurements = {
  allDayRow: null,
  colWidths: [320],
  hourHeight: 60,
  mainGrid: {
    bottom: 780,
    height: 780,
    left: 0,
    right: 320,
    top: 0,
    width: 320,
    x: 0,
    y: 0,
  },
};

const visibleDates = [
  { date: dayjs("2026-05-20T00:00:00.000"), key: "2026-05-20" },
];
const weekMeasurements = {
  ...measurements,
  colWidths: [100, 110, 120, 130, 140, 150, 160],
};
const weekVisibleDates = Array.from({ length: 7 }, (_, index) => {
  const date = dayjs("2026-05-17T00:00:00.000").add(index, "day");

  return {
    date,
    key: date.format("YYYY-MM-DD"),
  };
});

describe("calendarEventPosition", () => {
  it("positions a timed event inside one visible date", () => {
    const position = getCalendarTimedEventPosition(
      {
        endDate: "2026-05-20T10:00:00.000",
        isAllDay: false,
        position: { widthMultiplier: 1 },
        startDate: "2026-05-20T09:00:00.000",
      } as never,
      { measurements, visibleDates, isDraft: false },
    );

    expect(position.left).toBeGreaterThan(0);
    expect(position.width).toBeLessThan(320);
    expect(position.height).toBeGreaterThan(0);
  });

  it("clips all-day spans to the one visible date", () => {
    const position = getCalendarAllDayEventPosition(
      {
        endDate: "2026-05-22",
        isAllDay: true,
        row: 1,
        startDate: "2026-05-19",
      } as never,
      { measurements, visibleDates, isDraft: false },
    );

    expect(position.left).toBe(0);
    expect(position.width).toBeGreaterThan(0);
    expect(position.width).toBe(310);
  });

  it("uses visible date order instead of local day-of-week indexes", () => {
    const wednesday = getCalendarTimedEventPosition(
      {
        endDate: "2026-05-20T10:00:00.000",
        isAllDay: false,
        position: { widthMultiplier: 1 },
        startDate: "2026-05-20T09:00:00.000",
      } as never,
      { measurements, visibleDates, isDraft: false },
    );

    expect(Number.isFinite(wednesday.left)).toBe(true);
    expect(Number.isFinite(wednesday.width)).toBe(true);
  });

  it("positions timed events by seven-date visible order", () => {
    const sevenDateMeasurements = {
      ...measurements,
      colWidths: [100, 110, 120, 130, 140, 150, 160],
    };
    const sevenVisibleDates = Array.from({ length: 7 }, (_, index) => ({
      date: dayjs("2026-05-20T00:00:00.000").add(index, "day"),
      key: String(index),
    }));

    const position = getCalendarTimedEventPosition(
      {
        endDate: "2026-05-22T10:00:00.000",
        isAllDay: false,
        position: { widthMultiplier: 1 },
        startDate: "2026-05-22T09:00:00.000",
      } as never,
      {
        measurements: sevenDateMeasurements,
        visibleDates: sevenVisibleDates,
        isDraft: false,
      },
    );

    expect(position.left).toBeGreaterThan(100 + 110);
    expect(position.width).toBeLessThan(120);
  });

  it("clips all-day spans across seven visible dates", () => {
    const sevenDateMeasurements = {
      ...measurements,
      colWidths: [100, 110, 120, 130, 140, 150, 160],
    };
    const sevenVisibleDates = Array.from({ length: 7 }, (_, index) => ({
      date: dayjs("2026-05-20T00:00:00.000").add(index, "day"),
      key: String(index),
    }));

    const position = getCalendarAllDayEventPosition(
      {
        endDate: "2026-05-25",
        isAllDay: true,
        row: 1,
        startDate: "2026-05-18",
      } as never,
      {
        measurements: sevenDateMeasurements,
        visibleDates: sevenVisibleDates,
        isDraft: false,
      },
    );

    expect(position.left).toBe(0);
    expect(position.width).toBe(100 + 110 + 120 + 130 + 140 - 10);
  });

  it("clips all-day events that start before the visible range", () => {
    const position = getCalendarAllDayEventPosition(
      {
        endDate: "2026-05-20",
        isAllDay: true,
        row: 1,
        startDate: "2026-05-15",
      } as never,
      {
        measurements: weekMeasurements,
        visibleDates: weekVisibleDates,
        isDraft: false,
      },
    );

    expect(position.left).toBe(0);
    expect(position.width).toBe(100 + 110 + 120 - 10);
  });

  it("clips all-day events that end after the visible range", () => {
    const position = getCalendarAllDayEventPosition(
      {
        endDate: "2026-05-26",
        isAllDay: true,
        row: 1,
        startDate: "2026-05-21",
      } as never,
      {
        measurements: weekMeasurements,
        visibleDates: weekVisibleDates,
        isDraft: false,
      },
    );

    expect(position.left).toBe(100 + 110 + 120 + 130);
    expect(position.width).toBe(140 + 150 + 160 - 10);
  });

  it("clips all-day events that span the whole visible range", () => {
    const position = getCalendarAllDayEventPosition(
      {
        endDate: "2026-05-26",
        isAllDay: true,
        row: 1,
        startDate: "2026-05-15",
      } as never,
      {
        measurements: weekMeasurements,
        visibleDates: weekVisibleDates,
        isDraft: false,
      },
    );

    expect(position.left).toBe(0);
    expect(position.width).toBe(100 + 110 + 120 + 130 + 140 + 150 + 160 - 10);
  });

  it("positions visible timed week events without old day-of-week fallback", () => {
    const position = getCalendarTimedEventPosition(
      {
        endDate: "2026-05-19T11:00:00.000",
        isAllDay: false,
        position: { widthMultiplier: 1 },
        startDate: "2026-05-19T10:00:00.000",
      } as never,
      {
        measurements: weekMeasurements,
        visibleDates: weekVisibleDates,
        isDraft: false,
      },
    );

    expect(position.left).toBeGreaterThan(100 + 110);
    expect(position.left).toBeLessThan(100 + 110 + 120);
    expect(position.width).toBeGreaterThan(0);
    expect(position.height).toBeGreaterThan(0);
  });

  it("returns a zero position for timed events outside visible dates", () => {
    const position = getCalendarTimedEventPosition(
      {
        endDate: "2026-05-21T10:00:00.000",
        isAllDay: false,
        position: { widthMultiplier: 1 },
        startDate: "2026-05-21T09:00:00.000",
      } as never,
      { measurements, visibleDates, isDraft: false },
    );

    expect(position).toEqual({ height: 0, left: 0, top: 0, width: 0 });
  });

  it("returns a zero position when no visible dates are provided", () => {
    const position = getCalendarTimedEventPosition(
      {
        endDate: "2026-05-20T10:00:00.000",
        isAllDay: false,
        position: { widthMultiplier: 1 },
        startDate: "2026-05-20T09:00:00.000",
      } as never,
      { measurements, visibleDates: [], isDraft: false },
    );

    expect(position).toEqual({ height: 0, left: 0, top: 0, width: 0 });
  });

  it("returns a zero position for all-day events outside visible dates", () => {
    const position = getCalendarAllDayEventPosition(
      {
        endDate: "2026-05-19",
        isAllDay: true,
        row: 1,
        startDate: "2026-05-18",
      } as never,
      { measurements, visibleDates, isDraft: false },
    );

    expect(position).toEqual({ height: 0, left: 0, top: 0, width: 0 });
  });
});
