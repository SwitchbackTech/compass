import { DEFAULT_WEEKLY_AVAILABILITY } from "@core/types/booking.contracts";
import { type IsoWeekday } from "@web/booking/booking.util";
import {
  availabilityFromRows,
  claimWeekday,
  rowsFromAvailability,
  textForRow,
} from "@web/booking/weekly-hours.rows";
import { describe, expect, test } from "bun:test";

describe("rowsFromAvailability", () => {
  test("groups Mon-Fri 09:00-17:00 into one row", () => {
    const rows = rowsFromAvailability(DEFAULT_WEEKLY_AVAILABILITY);
    expect(rows).toHaveLength(1);
    expect([...rows[0]!.weekdays].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(rows[0]!.text).toBe("9am-5pm");
  });

  test("groups matching weekday hours even when stored order is scrambled", () => {
    const rows = rowsFromAvailability([
      { weekday: 6, start: "10:00", end: "14:00" },
      { weekday: 3, start: "13:00", end: "17:00" },
      { weekday: 1, start: "13:00", end: "17:00" },
      { weekday: 5, start: "09:00", end: "12:00" },
      { weekday: 2, start: "09:00", end: "12:00" },
      { weekday: 4, start: "13:00", end: "17:00" },
      { weekday: 1, start: "09:00", end: "12:00" },
      { weekday: 5, start: "13:00", end: "17:00" },
      { weekday: 2, start: "13:00", end: "17:00" },
      { weekday: 3, start: "09:00", end: "12:00" },
      { weekday: 4, start: "09:00", end: "12:00" },
    ]);

    expect(rows).toHaveLength(2);
    expect([...rows[0]!.weekdays].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(rows[0]!.text).toBe("9am-12pm, 1pm-5pm");
    expect([...rows[1]!.weekdays]).toEqual([6]);
    expect(rows[1]!.text).toBe("10am-2pm");
  });
});

describe("availabilityFromRows", () => {
  test("round-trips a Mon-Fri 9-5 row", () => {
    const rows = rowsFromAvailability(DEFAULT_WEEKLY_AVAILABILITY);
    const result = availabilityFromRows(rows);
    expect(result).toEqual({
      ok: true,
      value: [...DEFAULT_WEEKLY_AVAILABILITY],
    });
  });

  test("round-trips two grouped rows", () => {
    const stored = [
      { weekday: 1 as const, start: "09:00", end: "12:00" },
      { weekday: 1 as const, start: "13:00", end: "17:00" },
      { weekday: 2 as const, start: "09:00", end: "12:00" },
      { weekday: 2 as const, start: "13:00", end: "17:00" },
      { weekday: 3 as const, start: "09:00", end: "12:00" },
      { weekday: 3 as const, start: "13:00", end: "17:00" },
      { weekday: 4 as const, start: "09:00", end: "12:00" },
      { weekday: 4 as const, start: "13:00", end: "17:00" },
      { weekday: 5 as const, start: "09:00", end: "12:00" },
      { weekday: 5 as const, start: "13:00", end: "17:00" },
      { weekday: 6 as const, start: "10:00", end: "14:00" },
    ];
    const result = availabilityFromRows(rowsFromAvailability(stored));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(stored);
    }
  });

  test("blank text with days emits nothing and is valid", () => {
    const result = availabilityFromRows([
      { weekdays: new Set([1, 2, 3]), text: "" },
    ]);
    expect(result).toEqual({ ok: true, value: [] });
  });

  test("text with no days errors", () => {
    const result = availabilityFromRows([{ weekdays: new Set(), text: "9-5" }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.get(0)).toBe("Choose at least one day.");
    }
  });

  test("first row wins when a weekday appears twice", () => {
    const result = availabilityFromRows([
      { weekdays: new Set([1]), text: "9-5" },
      { weekdays: new Set([1]), text: "10-2" },
    ]);
    expect(result).toEqual({
      ok: true,
      value: [{ weekday: 1, start: "09:00", end: "17:00" }],
    });
  });
});

describe("claimWeekday", () => {
  test("removes the day from its previous row", () => {
    const rows = [
      { weekdays: new Set<IsoWeekday>([1, 2, 3, 4, 5]), text: "9am-5pm" },
      { weekdays: new Set<IsoWeekday>(), text: "" },
    ];
    const next = claimWeekday(rows, 1, 1);
    expect(next[0]!.weekdays.has(1)).toBe(false);
    expect(next[1]!.weekdays.has(1)).toBe(true);
    expect([...next[0]!.weekdays].sort()).toEqual([2, 3, 4, 5]);
  });
});

describe("textForRow", () => {
  test("reads the first weekday's formatted hours", () => {
    expect(
      textForRow(DEFAULT_WEEKLY_AVAILABILITY, {
        weekdays: new Set([3, 1, 5]),
        text: "typed",
      }),
    ).toBe("9am-5pm");
  });
});
