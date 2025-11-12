import dayjs from "@core/util/date/dayjs";
import {
  correctInvalidDate,
  formatDateForUrl,
  getValidDateFromUrl,
  parseDateFromUrl,
} from "./date-route.util";

describe("date-route.util", () => {
  describe("parseDateFromUrl", () => {
    it("should parse valid date strings", () => {
      const result = parseDateFromUrl("2025-10-20");
      expect(result).toBeTruthy();
      expect(result?.format("YYYY-MM-DD")).toBe("2025-10-20");
    });

    it("should maintain consistency between URL parsing and date generation", () => {
      // Test that parsing a URL date gives the same result as generating it
      const testDate = "2025-10-19";

      // Parse from URL
      const parsedFromUrl = parseDateFromUrl(testDate);

      // Generate from local date string
      const generatedFromLocal = dayjs.utc(testDate);

      // Both should be identical
      expect(parsedFromUrl?.format()).toBe(generatedFromLocal.format());
      expect(parsedFromUrl?.format("dddd, MMMM D")).toBe("Sunday, October 19");
    });

    it("should return null for invalid date strings", () => {
      expect(parseDateFromUrl("invalid-date")).toBeNull();
      expect(parseDateFromUrl("2025-13-15")).toBeNull();
      expect(parseDateFromUrl("2025-10-40")).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(parseDateFromUrl(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(parseDateFromUrl("")).toBeNull();
    });
  });

  describe("correctInvalidDate", () => {
    it("should return valid dates unchanged", () => {
      const result = correctInvalidDate("2025-10-20");
      expect(result).toBeTruthy();
      expect(result?.format("YYYY-MM-DD")).toBe("2025-10-20");
    });

    it("should correct invalid day values", () => {
      // Day 0 should become day 1
      const result1 = correctInvalidDate("2025-10-0");
      expect(result1?.format("YYYY-MM-DD")).toBe("2025-10-01");

      // Day 40 should become last day of month (31 for October)
      const result2 = correctInvalidDate("2025-10-40");
      expect(result2?.format("YYYY-MM-DD")).toBe("2025-10-31");

      // Day 32 in February should become last day of February
      const result3 = correctInvalidDate("2025-02-32");
      expect(result3?.format("YYYY-MM-DD")).toBe("2025-02-28");
    });

    it("should correct invalid month values", () => {
      // Month 0 should become month 1
      const result1 = correctInvalidDate("2025-0-15");
      expect(result1?.format("YYYY-MM-DD")).toBe("2025-01-15");

      // Month 13 should become month 12
      const result2 = correctInvalidDate("2025-13-15");
      expect(result2?.format("YYYY-MM-DD")).toBe("2025-12-15");
    });

    it("should handle leap year February correctly", () => {
      // 2024 is a leap year, so Feb 29 should be valid
      const result1 = correctInvalidDate("2024-02-29");
      expect(result1?.format("YYYY-MM-DD")).toBe("2024-02-29");

      // 2025 is not a leap year, so Feb 29 should become Feb 28
      const result2 = correctInvalidDate("2025-02-29");
      expect(result2?.format("YYYY-MM-DD")).toBe("2025-02-28");
    });

    it("should return null for completely invalid input", () => {
      expect(correctInvalidDate("not-a-date")).toBeNull();
      expect(correctInvalidDate("2025")).toBeNull();
      expect(correctInvalidDate("")).toBeNull();
    });
  });

  describe("getValidDateFromUrl", () => {
    it("should return parsed date for valid input", () => {
      const result = getValidDateFromUrl("2025-10-20");
      expect(result.format("YYYY-MM-DD")).toBe("2025-10-20");
    });

    it("should return corrected date for invalid input", () => {
      const result = getValidDateFromUrl("2025-10-40");
      expect(result.format("YYYY-MM-DD")).toBe("2025-10-31");
    });

    it("should return today's date for undefined input", () => {
      const result = getValidDateFromUrl(undefined);
      const today = dayjs();
      expect(result.local().startOf("day").isSame(today.startOf("day"))).toBe(
        true,
      );
    });

    it("should return today's date for completely invalid input", () => {
      const result = getValidDateFromUrl("completely-invalid");
      const today = dayjs();
      expect(result.local().startOf("day").isSame(today.startOf("day"))).toBe(
        true,
      );
    });
  });

  describe("formatDateForUrl", () => {
    it("should format date correctly for URL", () => {
      const date = dayjs("2025-10-20");
      const result = formatDateForUrl(date);
      expect(result).toBe("2025-10-20");
    });

    it("should handle different dates correctly", () => {
      const date1 = dayjs("2024-02-29");
      expect(formatDateForUrl(date1)).toBe("2024-02-29");

      const date2 = dayjs("2023-12-31");
      expect(formatDateForUrl(date2)).toBe("2023-12-31");
    });
  });
});
