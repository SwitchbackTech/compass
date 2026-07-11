import { buildCalendarDayColumns } from "./calendarLayoutCache";
import { describe, expect, it } from "bun:test";

const weekDates = [
  "2026-06-28",
  "2026-06-29",
  "2026-06-30",
  "2026-07-01",
  "2026-07-02",
  "2026-07-03",
  "2026-07-04",
];

describe("calendarLayoutCache", () => {
  it("builds seven columns for Week, each carrying its date", () => {
    const columns = buildCalendarDayColumns(
      { left: 10, width: 700 },
      weekDates,
    );

    expect(columns).toHaveLength(7);
    expect(columns[0]).toMatchObject({
      date: "2026-06-28",
      index: 0,
      left: 10,
      width: 100,
    });
    expect(columns[6]).toMatchObject({
      date: "2026-07-04",
      index: 6,
      left: 610,
      width: 100,
    });
  });

  it("builds a windowed subset of the week", () => {
    const columns = buildCalendarDayColumns(
      { left: 0, width: 300 },
      weekDates.slice(3, 6),
    );

    expect(columns).toHaveLength(3);
    expect(columns[0]).toMatchObject({ date: "2026-07-01", index: 0 });
    expect(columns[2]).toMatchObject({ date: "2026-07-03", index: 2 });
  });

  it("builds one column for Day", () => {
    const columns = buildCalendarDayColumns({ left: 20, width: 320 }, [
      "2026-07-04",
    ]);

    expect(columns).toEqual([
      { date: "2026-07-04", index: 0, left: 20, width: 320 },
    ]);
  });

  it("builds no columns without dates", () => {
    expect(buildCalendarDayColumns({ left: 0, width: 700 }, [])).toEqual([]);
  });
});
