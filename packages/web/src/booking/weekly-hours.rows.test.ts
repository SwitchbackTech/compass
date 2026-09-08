import { DEFAULT_WEEKLY_AVAILABILITY } from "@core/types/booking.contracts";
import { type IsoWeekday } from "@web/booking/booking.util";
import {
  availabilityFromRows,
  claimWeekday,
  DEFAULT_HOURS_ROW,
  endOptionsAfter,
  formatTimeLabel,
  rowsFromAvailability,
  snapEndAfterStart,
  summarizeHoursRows,
} from "@web/booking/weekly-hours.rows";
import { describe, expect, test } from "bun:test";

describe("rowsFromAvailability", () => {
  test("groups Mon-Fri 09:00-17:00 into one row", () => {
    const rows = rowsFromAvailability(DEFAULT_WEEKLY_AVAILABILITY);
    expect(rows).toHaveLength(1);
    expect([...rows[0]!.weekdays].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(rows[0]!.start).toBe("09:00");
    expect(rows[0]!.end).toBe("17:00");
  });

  test("keeps only the first interval when a day has two", () => {
    const rows = rowsFromAvailability([
      { weekday: 1, start: "09:00", end: "12:00" },
      { weekday: 1, start: "13:00", end: "17:00" },
      { weekday: 6, start: "10:00", end: "14:00" },
    ]);

    expect(rows).toHaveLength(2);
    expect([...rows[0]!.weekdays]).toEqual([1]);
    expect(rows[0]!.start).toBe("09:00");
    expect(rows[0]!.end).toBe("12:00");
    expect([...rows[1]!.weekdays]).toEqual([6]);
    expect(rows[1]!.start).toBe("10:00");
    expect(rows[1]!.end).toBe("14:00");
  });
});

describe("availabilityFromRows", () => {
  test("round-trips a Mon-Fri 09:00-17:00 row", () => {
    const rows = rowsFromAvailability(DEFAULT_WEEKLY_AVAILABILITY);
    expect(availabilityFromRows(rows)).toEqual([
      ...DEFAULT_WEEKLY_AVAILABILITY,
    ]);
  });

  test("rows with no weekdays contribute nothing", () => {
    expect(
      availabilityFromRows([
        { weekdays: new Set(), start: "09:00", end: "17:00" },
      ]),
    ).toEqual([]);
  });

  test("first row wins when a weekday appears twice", () => {
    expect(
      availabilityFromRows([
        { weekdays: new Set([1]), start: "09:00", end: "17:00" },
        { weekdays: new Set([1]), start: "10:00", end: "14:00" },
      ]),
    ).toEqual([{ weekday: 1, start: "09:00", end: "17:00" }]);
  });
});

describe("claimWeekday", () => {
  test("removes the day from its previous row", () => {
    const rows = [
      { ...DEFAULT_HOURS_ROW, weekdays: new Set<IsoWeekday>([1, 2, 3, 4, 5]) },
      { weekdays: new Set<IsoWeekday>(), start: "10:00", end: "14:00" },
    ];
    const next = claimWeekday(rows, 1, 1);
    expect(next[0]!.weekdays.has(1)).toBe(false);
    expect(next[1]!.weekdays.has(1)).toBe(true);
    expect([...next[0]!.weekdays].sort()).toEqual([2, 3, 4, 5]);
  });

  test("removes a second row that loses its last day", () => {
    const rows = [
      { ...DEFAULT_HOURS_ROW },
      { weekdays: new Set<IsoWeekday>([6]), start: "10:00", end: "14:00" },
    ];
    const next = claimWeekday(rows, 1, 6);
    expect(next).toHaveLength(1);
    expect([...next[0]!.weekdays].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("snapEndAfterStart", () => {
  test("snaps End to Start plus one hour when Start passes it", () => {
    expect(snapEndAfterStart("17:00", "17:00")).toBe("18:00");
    expect(snapEndAfterStart("17:00", "16:45")).toBe("18:00");
    expect(snapEndAfterStart("09:00", "17:00")).toBe("17:00");
  });
});

describe("endOptionsAfter", () => {
  test("excludes the Start time", () => {
    expect(endOptionsAfter("17:00")).not.toContain("17:00");
    expect(endOptionsAfter("17:00")[0]).toBe("17:15");
  });
});

describe("formatTimeLabel", () => {
  test("renders 12-hour labels", () => {
    expect(formatTimeLabel("09:00")).toBe("9:00 AM");
    expect(formatTimeLabel("17:00")).toBe("5:00 PM");
  });
});

describe("summarizeHoursRows", () => {
  test("renders a consecutive weekday span", () => {
    expect(summarizeHoursRows([DEFAULT_HOURS_ROW])).toBe(
      "Mon to Fri, 9:00 AM to 5:00 PM",
    );
  });

  test("renders a non-consecutive day list", () => {
    expect(
      summarizeHoursRows([
        { weekdays: new Set<IsoWeekday>([1, 3]), start: "09:00", end: "12:00" },
      ]),
    ).toBe("Mon, Wed, 9:00 AM to 12:00 PM");
  });
});
