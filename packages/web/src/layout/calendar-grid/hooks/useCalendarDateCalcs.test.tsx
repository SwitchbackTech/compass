import { renderHook } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { type CalendarGridMeasurements } from "../types/calendarGrid.types";
import { useCalendarDateCalcs } from "./useCalendarDateCalcs";
import { describe, expect, it } from "bun:test";

const measurements = (colWidths: number[]): CalendarGridMeasurements => ({
  allDayRow: null,
  colWidths,
  hourHeight: 60,
  mainGrid: {
    bottom: 780,
    height: 780,
    left: 0,
    right: colWidths.reduce((sum, width) => sum + width, 0),
    top: 0,
    width: colWidths.reduce((sum, width) => sum + width, 0),
    x: 0,
    y: 0,
  },
});

const mainGridRef = { current: null };

describe("useCalendarDateCalcs", () => {
  it("maps any x inside a one-date grid to the one visible date", () => {
    const visibleDate = dayjs("2026-05-20T00:00:00.000");
    const { result } = renderHook(() =>
      useCalendarDateCalcs(measurements([320]), mainGridRef, [
        { date: visibleDate, key: "2026-05-20" },
      ]),
    );

    expect(result.current.getDateByXY(5, 0).isSame(visibleDate, "day")).toBe(
      true,
    );
    expect(result.current.getDateByXY(999, 0).isSame(visibleDate, "day")).toBe(
      true,
    );
  });

  it("maps seven-date grid x positions to visible date columns", () => {
    const visibleDates = Array.from({ length: 7 }, (_, index) => ({
      date: dayjs("2026-05-18T00:00:00.000").add(index, "day"),
      key: String(index),
    }));
    const { result } = renderHook(() =>
      useCalendarDateCalcs(
        measurements([100, 100, 100, 100, 100, 100, 100]),
        mainGridRef,
        visibleDates,
      ),
    );

    expect(result.current.getDateByXY(250, 0).format("YYYY-MM-DD")).toBe(
      "2026-05-20",
    );
    expect(result.current.getDateByXY(999, 0).format("YYYY-MM-DD")).toBe(
      "2026-05-24",
    );
  });

  it("snaps y positions to fifteen-minute boundaries", () => {
    const { result } = renderHook(() =>
      useCalendarDateCalcs(measurements([320]), mainGridRef, [
        { date: dayjs("2026-05-20T00:00:00.000"), key: "2026-05-20" },
      ]),
    );

    expect(result.current.getDateByXY(10, 74).format("HH:mm")).toBe("01:00");
  });
});
