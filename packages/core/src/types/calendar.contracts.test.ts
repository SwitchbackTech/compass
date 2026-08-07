import { faker } from "@faker-js/faker";
import {
  type CalendarAccess,
  CalendarListResponseSchema,
  CalendarSchema,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";

const validCalendar = {
  id: faker.database.mongodbObjectId(),
  name: "Personal",
  description: "",
  timeZone: "America/Denver",
  foregroundColor: "#ffffff",
  backgroundColor: "#000000",
  provider: "local",
  access: "owner",
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: true,
  isVisible: true,
  isActive: true,
};

describe("Calendar Contracts", () => {
  describe("CalendarSchema", () => {
    it("parses a fully valid calendar", () => {
      expect(CalendarSchema.safeParse(validCalendar).success).toBe(true);
    });

    it("rejects an unknown key", () => {
      const result = CalendarSchema.safeParse({
        ...validCalendar,
        extra: true,
      });

      expect(result.success).toBe(false);
    });

    it("accepts a null timeZone", () => {
      const result = CalendarSchema.safeParse({
        ...validCalendar,
        timeZone: null,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("getCalendarCapabilities", () => {
    it("returns full capabilities for an owner", () => {
      expect(getCalendarCapabilities("owner")).toEqual({
        canReadAvailability: true,
        canReadDetails: true,
        canWrite: true,
        canManage: true,
        canWatchEvents: true,
      });
    });

    it("returns write-but-not-manage capabilities for a writer", () => {
      expect(getCalendarCapabilities("writer")).toEqual({
        canReadAvailability: true,
        canReadDetails: true,
        canWrite: true,
        canManage: false,
        canWatchEvents: true,
      });
    });

    it("returns read-only capabilities for a reader", () => {
      expect(getCalendarCapabilities("reader")).toEqual({
        canReadAvailability: true,
        canReadDetails: true,
        canWrite: false,
        canManage: false,
        canWatchEvents: true,
      });
    });

    it("returns availability-only capabilities for a freeBusyReader", () => {
      expect(getCalendarCapabilities("freeBusyReader")).toEqual({
        canReadAvailability: true,
        canReadDetails: false,
        canWrite: false,
        canManage: false,
        canWatchEvents: false,
      });
    });

    it("covers every access role with no leftovers", () => {
      const roles: CalendarAccess[] = [
        "owner",
        "writer",
        "reader",
        "freeBusyReader",
      ];

      for (const role of roles) {
        expect(() => getCalendarCapabilities(role)).not.toThrow();
      }
    });
  });

  describe("CalendarListResponseSchema", () => {
    it("parses a list of calendars", () => {
      const result = CalendarListResponseSchema.safeParse({
        calendars: [validCalendar],
      });

      expect(result.success).toBe(true);
    });

    it("rejects unknown keys", () => {
      const result = CalendarListResponseSchema.safeParse({
        calendars: [],
        nextCursor: null,
      });

      expect(result.success).toBe(false);
    });
  });
});
