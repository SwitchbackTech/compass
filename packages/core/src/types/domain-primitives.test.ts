import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  CalendarIdSchema,
  DateOnlySchema,
  DateTimeSchema,
  EventIdSchema,
  PrioritySchema,
  RRuleSchema,
  SortOrderSchema,
  TimeZoneSchema,
} from "@core/types/domain-primitives";

describe("Domain Primitives", () => {
  describe("EventIdSchema", () => {
    it("accepts a 24-character hex id", () => {
      expect(
        EventIdSchema.safeParse(faker.database.mongodbObjectId()).success,
      ).toBe(true);
    });

    it("rejects a short id", () => {
      expect(EventIdSchema.safeParse("abc123").success).toBe(false);
    });

    it("rejects a non-hex id", () => {
      expect(EventIdSchema.safeParse("g".repeat(24)).success).toBe(false);
    });
  });

  describe("CalendarIdSchema", () => {
    it("accepts a 24-character hex id", () => {
      expect(
        CalendarIdSchema.safeParse(faker.database.mongodbObjectId()).success,
      ).toBe(true);
    });

    it("rejects a short id", () => {
      expect(CalendarIdSchema.safeParse("abc123").success).toBe(false);
    });

    it("rejects a non-hex id", () => {
      expect(CalendarIdSchema.safeParse("g".repeat(24)).success).toBe(false);
    });
  });

  describe("DateOnlySchema", () => {
    it("accepts a valid calendar date", () => {
      expect(DateOnlySchema.safeParse("2026-07-14").success).toBe(true);
    });

    it("accepts a leap day", () => {
      expect(DateOnlySchema.safeParse("2024-02-29").success).toBe(true);
    });

    it("rejects a rollover day (Feb 30)", () => {
      expect(DateOnlySchema.safeParse("2026-02-30").success).toBe(false);
    });

    it("rejects a rollover month (month 13)", () => {
      expect(DateOnlySchema.safeParse("2026-13-01").success).toBe(false);
    });

    it("rejects a non-zero-padded date", () => {
      expect(DateOnlySchema.safeParse("2026-7-4").success).toBe(false);
    });
  });

  describe("DateTimeSchema", () => {
    it("accepts a Z-offset timestamp", () => {
      expect(DateTimeSchema.safeParse("2026-07-14T10:00:00Z").success).toBe(
        true,
      );
    });

    it("accepts a numeric-offset timestamp", () => {
      expect(
        DateTimeSchema.safeParse("2026-07-14T10:00:00-06:00").success,
      ).toBe(true);
    });

    it("rejects a timestamp with no offset", () => {
      expect(DateTimeSchema.safeParse("2026-07-14T10:00:00").success).toBe(
        false,
      );
    });
  });

  describe("TimeZoneSchema", () => {
    it("accepts a valid IANA time zone", () => {
      expect(TimeZoneSchema.safeParse("America/Denver").success).toBe(true);
    });

    it("rejects an invalid time zone", () => {
      expect(TimeZoneSchema.safeParse("Not/AZone").success).toBe(false);
    });
  });

  describe("SortOrderSchema", () => {
    it("accepts a non-negative integer", () => {
      expect(SortOrderSchema.safeParse(0).success).toBe(true);
      expect(SortOrderSchema.safeParse(5).success).toBe(true);
    });

    it("rejects a negative number", () => {
      expect(SortOrderSchema.safeParse(-1).success).toBe(false);
    });

    it("rejects a float", () => {
      expect(SortOrderSchema.safeParse(1.5).success).toBe(false);
    });
  });

  describe("RRuleSchema", () => {
    it("rejects an empty array", () => {
      expect(RRuleSchema.safeParse([]).success).toBe(false);
    });

    it("rejects an array containing an empty string", () => {
      expect(RRuleSchema.safeParse([""]).success).toBe(false);
    });

    it("accepts a non-empty array of rule lines", () => {
      expect(RRuleSchema.safeParse(["RRULE:FREQ=WEEKLY"]).success).toBe(true);
    });
  });

  describe("PrioritySchema", () => {
    it("accepts every priority enum value", () => {
      for (const priority of Object.values(Priorities)) {
        expect(PrioritySchema.safeParse(priority).success).toBe(true);
      }
    });

    it("rejects an unrecognized priority", () => {
      expect(PrioritySchema.safeParse("other").success).toBe(false);
    });
  });
});
