import dayjs from "@core/util/date/dayjs";
import { MINUTES_PER_SLOT, SLOT_HEIGHT } from "../../constants/day.constants";
import { getNowLinePosition, getTimeFromPosition } from "./agenda.util";

describe("agenda.util", () => {
  describe("getNowLinePosition", () => {
    it("should position at exact hour marks correctly", () => {
      // 3:00pm (15:00 in 24-hour format)
      const date = new Date();
      date.setHours(15, 0, 0, 0);
      const position = getNowLinePosition(date);
      // 15 hours * 4 slots/hour * 20px/slot = 1200px
      expect(position).toBe(1200);
    });

    it("should position at quarter-hour marks correctly", () => {
      // 3:15pm (15:15 in 24-hour format)
      const date = new Date();
      date.setHours(15, 15, 0, 0);
      const position = getNowLinePosition(date);
      // (15 * 4 + 15/15) * 20 = (60 + 1) * 20 = 1220px
      expect(position).toBe(1220);
    });

    it("should position at half-hour marks correctly", () => {
      // 3:30pm (15:30 in 24-hour format)
      const date = new Date();
      date.setHours(15, 30, 0, 0);
      const position = getNowLinePosition(date);
      // (15 * 4 + 30/15) * 20 = (60 + 2) * 20 = 1240px
      expect(position).toBe(1240);
    });

    it("should position at three-quarter hour marks correctly", () => {
      // 3:45pm (15:45 in 24-hour format)
      const date = new Date();
      date.setHours(15, 45, 0, 0);
      const position = getNowLinePosition(date);
      // (15 * 4 + 45/15) * 20 = (60 + 3) * 20 = 1260px
      expect(position).toBe(1260);
    });

    it("should position at 3:26pm correctly (fractional minutes)", () => {
      // 3:26pm (15:26 in 24-hour format)
      const date = new Date();
      date.setHours(15, 26, 0, 0);
      const position = getNowLinePosition(date);
      // (15 * 4 + 26/15) * 20 = (60 + 1.733...) * 20 ≈ 1234.67px
      const expectedPosition = (15 * 4 + 26 / MINUTES_PER_SLOT) * SLOT_HEIGHT;
      expect(position).toBeCloseTo(expectedPosition, 2);
      // Verify it's approximately 43% between 3pm (1200px) and 4pm (1280px)
      // 26/60 = 0.433... of the hour
      // 1200 + (0.433... * 80) ≈ 1234.67px
      expect(position).toBeCloseTo(1234.67, 2);
    });

    it("should position at single minutes correctly", () => {
      // 3:01pm (15:01 in 24-hour format)
      const date = new Date();
      date.setHours(15, 1, 0, 0);
      const position = getNowLinePosition(date);
      // (15 * 4 + 1/15) * 20 = (60 + 0.0667) * 20 ≈ 1201.33px
      const expectedPosition = (15 * 4 + 1 / MINUTES_PER_SLOT) * SLOT_HEIGHT;
      expect(position).toBeCloseTo(expectedPosition, 2);
    });

    it("should position at 3:07pm correctly", () => {
      // 3:07pm (15:07 in 24-hour format)
      const date = new Date();
      date.setHours(15, 7, 0, 0);
      const position = getNowLinePosition(date);
      // (15 * 4 + 7/15) * 20 = (60 + 0.4667) * 20 ≈ 1209.33px
      const expectedPosition = (15 * 4 + 7 / MINUTES_PER_SLOT) * SLOT_HEIGHT;
      expect(position).toBeCloseTo(expectedPosition, 2);
    });

    it("should position at midnight correctly", () => {
      // 0:00 (midnight)
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      const position = getNowLinePosition(date);
      // 0 * 4 * 20 = 0px
      expect(position).toBe(0);
    });

    it("should position at end of day correctly", () => {
      // 23:59 (end of day)
      const date = new Date();
      date.setHours(23, 59, 0, 0);
      const position = getNowLinePosition(date);
      // (23 * 4 + 59/15) * 20 = (92 + 3.933...) * 20 ≈ 1918.67px
      const expectedPosition = (23 * 4 + 59 / MINUTES_PER_SLOT) * SLOT_HEIGHT;
      expect(position).toBeCloseTo(expectedPosition, 2);
    });

    it("should position at noon correctly", () => {
      // 12:00pm (12:00 in 24-hour format)
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      const position = getNowLinePosition(date);
      // 12 * 4 * 20 = 960px
      expect(position).toBe(960);
    });

    it("should position at 1:00am correctly", () => {
      // 1:00am (1:00 in 24-hour format)
      const date = new Date();
      date.setHours(1, 0, 0, 0);
      const position = getNowLinePosition(date);
      // 1 * 4 * 20 = 80px
      expect(position).toBe(80);
    });

    it("should handle seconds correctly (ignores seconds)", () => {
      // 3:26:30pm - should position same as 3:26pm
      const date1 = new Date();
      date1.setHours(15, 26, 30, 0);
      const position1 = getNowLinePosition(date1);

      const date2 = new Date();
      date2.setHours(15, 26, 0, 0);
      const position2 = getNowLinePosition(date2);

      // Both should be the same since we only use hours and minutes
      expect(position1).toBe(position2);
    });

    it("should calculate position proportionally within an hour", () => {
      // Verify that 3:26pm is approximately 43% between 3pm and 4pm
      const date3pm = new Date();
      date3pm.setHours(15, 0, 0, 0);
      const position3pm = getNowLinePosition(date3pm);

      const date4pm = new Date();
      date4pm.setHours(16, 0, 0, 0);
      const position4pm = getNowLinePosition(date4pm);

      const date326pm = new Date();
      date326pm.setHours(15, 26, 0, 0);
      const position326pm = getNowLinePosition(date326pm);

      const hourHeight = position4pm - position3pm; // Should be 80px (4 slots * 20px)
      const offsetFrom3pm = position326pm - position3pm;
      const percentage = offsetFrom3pm / hourHeight;

      // 26 minutes / 60 minutes = 0.4333... ≈ 43%
      expect(percentage).toBeCloseTo(26 / 60, 2);
      expect(percentage).toBeCloseTo(0.4333, 2);
    });
  });

  describe("getTimeFromPosition", () => {
    const dateInView = dayjs("2024-01-15");

    it("should calculate time at midnight (position 0)", () => {
      const result = getTimeFromPosition(0, dateInView);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it("should calculate time at 1am (position 80px)", () => {
      // 1 hour = 4 slots = 80px
      const result = getTimeFromPosition(80, dateInView);
      expect(result.getHours()).toBe(1);
      expect(result.getMinutes()).toBe(0);
    });

    it("should calculate time at 12pm (position 960px)", () => {
      // 12 hours = 48 slots = 960px
      const result = getTimeFromPosition(960, dateInView);
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(0);
    });

    it("should calculate time at 3:15pm (position 1220px)", () => {
      // 15:15 = 61 slots = 1220px
      const result = getTimeFromPosition(1220, dateInView);
      expect(result.getHours()).toBe(15);
      expect(result.getMinutes()).toBe(15);
    });

    it("should snap to 15-minute slots", () => {
      // Position 1230 is between 15:15 (1220) and 15:30 (1240)
      // Should snap to 15:15
      const result = getTimeFromPosition(1230, dateInView);
      expect(result.getHours()).toBe(15);
      expect(result.getMinutes()).toBe(15);
    });

    it("should clamp to 23:45 at extreme positions", () => {
      // Very large position should clamp to 23:45
      const result = getTimeFromPosition(9999, dateInView);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(45);
    });

    it("should use the dateInView for the date portion", () => {
      const specificDate = dayjs("2024-06-20");
      const result = getTimeFromPosition(480, specificDate);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5); // June (0-indexed)
      expect(result.getDate()).toBe(20);
    });

    it("should be inverse of getAgendaEventPosition for slot-aligned times", () => {
      // Test round-trip: position -> time -> position
      const testPositions = [0, 80, 240, 480, 960, 1200, 1280, 1800];

      for (const position of testPositions) {
        const time = getTimeFromPosition(position, dateInView);
        const resultPosition = getNowLinePosition(time);
        expect(resultPosition).toBe(position);
      }
    });
  });
});
