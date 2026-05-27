import { buildCalendarDayColumns } from "./calendarLayoutCache";
import { describe, expect, it } from "bun:test";

describe("calendarLayoutCache", () => {
  it("builds seven columns for Week", () => {
    const columns = buildCalendarDayColumns({ left: 10, width: 700 }, 7);

    expect(columns).toHaveLength(7);
    expect(columns[0]).toMatchObject({ index: 0, left: 10, width: 100 });
    expect(columns[6]).toMatchObject({ index: 6, left: 610, width: 100 });
  });

  it("builds one column for Day", () => {
    const columns = buildCalendarDayColumns({ left: 20, width: 320 }, 1);

    expect(columns).toEqual([{ index: 0, left: 20, width: 320 }]);
  });
});
