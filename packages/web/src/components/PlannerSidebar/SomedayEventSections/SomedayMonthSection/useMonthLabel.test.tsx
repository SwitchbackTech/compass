import dayjs from "@core/util/date/dayjs";
import { getSomedayMonthLabel } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayMonthSection/useMonthLabel";

describe("getSomedayMonthLabel()", () => {
  it('returns "This Month" when today is inside the selected month', () => {
    expect(
      getSomedayMonthLabel("January", dayjs("2025-01-01"), dayjs("2025-01-20")),
    ).toBe("This Month");
  });

  it("returns the month label when today is outside the selected month", () => {
    expect(
      getSomedayMonthLabel("April", dayjs("2026-04-01"), dayjs("2026-05-11")),
    ).toBe("April");
  });
});
