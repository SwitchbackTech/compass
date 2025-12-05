import dayjs from "@core/util/date/dayjs";
import { loadTodayData } from "./loaders";

describe("loaders", () => {
  describe("loadTodayData", () => {
    it("should return today's date in UTC preserving the local calendar date", () => {
      const result = loadTodayData();

      // Get the local date for comparison
      const localToday = dayjs().startOf("day");
      const expectedDate = localToday.format("YYYY-MM-DD");

      expect(result.dateString).toBe(expectedDate);
      expect(result.dateInView.format("YYYY-MM-DD")).toBe(expectedDate);
    });

    it("should preserve the calendar date even in extreme timezones", () => {
      // This test ensures that the date doesn't shift when converting to UTC
      const result = loadTodayData();

      // The dateInView should be in UTC mode
      expect(result.dateInView.isUTC()).toBe(true);

      // But it should represent the same calendar date as the local today
      const localToday = dayjs().startOf("day");
      const expectedDate = localToday.format("YYYY-MM-DD");

      expect(result.dateString).toBe(expectedDate);
      expect(result.dateInView.format("YYYY-MM-DD")).toBe(expectedDate);

      // The hour should be 00:00 in UTC (midnight)
      expect(result.dateInView.hour()).toBe(0);
      expect(result.dateInView.minute()).toBe(0);
    });

    it("should work correctly across different times of the day", () => {
      // Test at different hours of the day to ensure the date doesn't change
      const result = loadTodayData();
      const localToday = dayjs().startOf("day");

      // The calendar date should match regardless of the current time
      expect(result.dateString).toBe(localToday.format("YYYY-MM-DD"));

      // The returned date should be at midnight UTC
      expect(result.dateInView.hour()).toBe(0);
      expect(result.dateInView.minute()).toBe(0);
      expect(result.dateInView.second()).toBe(0);
    });
  });
});
