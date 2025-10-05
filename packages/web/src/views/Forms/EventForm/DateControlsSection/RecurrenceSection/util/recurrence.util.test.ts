import { RRule } from "rrule";
import { WEEKDAYS } from "../constants/recurrence.constants";
import { toWeekDays } from "./recurrence.util";

describe("recurrence.util", () => {
  describe("toWeekDays", () => {
    it("should convert all weekdays to their corresponding RRule values", () => {
      const result = toWeekDays(WEEKDAYS);
      const expected = [
        RRule.SU, // sunday
        RRule.MO, // monday
        RRule.TU, // tuesday
        RRule.WE, // wednesday
        RRule.TH, // thursday
        RRule.FR, // friday
        RRule.SA, // saturday
      ];
      expect(result).toEqual(expected);
    });

    it("should convert a single weekday", () => {
      const result = toWeekDays(["monday"]);
      expect(result).toEqual([RRule.MO]);
    });

    it("should convert multiple weekdays", () => {
      const result = toWeekDays(["monday", "wednesday", "friday"]);
      expect(result).toEqual([RRule.MO, RRule.WE, RRule.FR]);
    });

    it("should handle empty array", () => {
      const result = toWeekDays([]);
      expect(result).toEqual([]);
    });

    it("should preserve order of input weekdays", () => {
      const input = ["friday", "monday", "sunday", "thursday"];
      const result = toWeekDays(input as (typeof WEEKDAYS)[0][]);
      const expected = [RRule.FR, RRule.MO, RRule.SU, RRule.TH];
      expect(result).toEqual(expected);
    });

    it("should handle duplicate weekdays", () => {
      const result = toWeekDays(["monday", "monday", "tuesday"]);
      expect(result).toEqual([RRule.MO, RRule.MO, RRule.TU]);
    });
  });
});
