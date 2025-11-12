import { MINUTES_PER_SLOT, SLOT_HEIGHT } from "../../constants/day.constants";
import { getNowLinePosition } from "./agenda.util";

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
});
