import "@testing-library/jest-dom";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  getSomedayWeekLabel,
  isCurrentWeek,
} from "@web/components/PlannerSidebar/SomedayEventSections/SomedayWeekSection/useWeekLabel";

const makeLabel = (start: Dayjs, end: Dayjs): string =>
  `${start.format("M.D")} - ${end.format("M.D")}`;

describe("isCurrentWeek()", () => {
  it("returns true when today is inside the selected week", () => {
    expect(
      isCurrentWeek(
        dayjs("2025-01-08"),
        dayjs("2025-01-12"),
        dayjs("2025-01-10"),
      ),
    ).toBe(true);
  });

  it("returns false when today is outside the selected week", () => {
    expect(
      isCurrentWeek(
        dayjs("2025-01-08"),
        dayjs("2025-01-12"),
        dayjs("2025-01-20"),
      ),
    ).toBe(false);
  });

  it("handles a week spanning from December to January", () => {
    expect(
      isCurrentWeek(
        dayjs("2025-12-30"),
        dayjs("2026-01-05"),
        dayjs("2026-01-02"),
      ),
    ).toBe(true);
  });

  it("handles leap-year February 29", () => {
    expect(
      isCurrentWeek(
        dayjs("2028-02-26"),
        dayjs("2028-03-03"),
        dayjs("2028-02-29"),
      ),
    ).toBe(true);
  });
});

describe("getSomedayWeekLabel()", () => {
  it('returns "This Week" when today is inside the selected week', () => {
    const viewStart = dayjs("2025-01-08");
    const viewEnd = dayjs("2025-01-12");

    expect(
      getSomedayWeekLabel(
        makeLabel(viewStart, viewEnd),
        viewStart,
        viewEnd,
        dayjs("2025-01-10"),
      ),
    ).toBe("This Week");
  });

  it("returns the date label when today is outside the selected week", () => {
    const viewStart = dayjs("2025-01-08");
    const viewEnd = dayjs("2025-01-12");
    const label = makeLabel(viewStart, viewEnd);

    expect(
      getSomedayWeekLabel(label, viewStart, viewEnd, dayjs("2025-01-20")),
    ).toBe(label);
  });
});
