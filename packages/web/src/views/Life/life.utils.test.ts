import {
  clampWeeksLived,
  getAgeOptions,
  getLifeDotLabel,
  getLifeGridColumns,
  getTotalLifeDots,
  getValidBirthDays,
  getWeekLivedCount,
  getYearOptions,
} from "./life.utils";
import { describe, expect, it } from "bun:test";

describe("life utils", () => {
  it("builds year options from 1900 through the current year", () => {
    expect(getYearOptions(2026).slice(0, 3)).toEqual(["1900", "1901", "1902"]);
    expect(getYearOptions(2026).at(-1)).toBe("2026");
  });

  it("builds age options from 1 through 150", () => {
    const ages = getAgeOptions();

    expect(ages[0]).toBe("1");
    expect(ages.at(-1)).toBe("150");
    expect(ages).toHaveLength(150);
  });

  it("returns valid birth days for normal and leap-year months", () => {
    expect(getValidBirthDays("2024", "2").at(-1)).toBe("29");
    expect(getValidBirthDays("2025", "2").at(-1)).toBe("28");
    expect(getValidBirthDays("2025", "4").at(-1)).toBe("30");
  });

  it("calculates and caps lived weeks", () => {
    const today = new Date(2026, 0, 1);

    expect(getWeekLivedCount("2000", "1", "1", 79 * 52, today)).toBe(1356);
    expect(getWeekLivedCount("2026", "12", "31", 79 * 52, today)).toBe(0);
    expect(getWeekLivedCount("1900", "1", "1", 79 * 52, today)).toBe(79 * 52);
  });

  it("calculates total dots from death age and falls back to 79 years", () => {
    expect(getTotalLifeDots("85")).toBe(85 * 52);
    expect(getTotalLifeDots("")).toBe(79 * 52);
    expect(getTotalLifeDots("-1")).toBe(79 * 52);
  });

  it("chooses desktop and mobile grid columns from zoom", () => {
    expect(getLifeGridColumns({ isMobile: false, zoom: 4 })).toBe(52);
    expect(getLifeGridColumns({ isMobile: true, zoom: 1 })).toBe(52);
    expect(getLifeGridColumns({ isMobile: true, zoom: 2 })).toBe(26);
    expect(getLifeGridColumns({ isMobile: true, zoom: 8 })).toBe(10);
  });

  it("formats dot tooltip labels from one-indexed week numbers", () => {
    expect(getLifeDotLabel(1)).toBe("Year 1, Week 1");
    expect(getLifeDotLabel(105)).toBe("Year 3, Week 1");
  });

  it("clamps arbitrary week counts to the available dot count", () => {
    expect(clampWeeksLived(-5, 100)).toBe(0);
    expect(clampWeeksLived(50, 100)).toBe(50);
    expect(clampWeeksLived(150, 100)).toBe(100);
  });
});
