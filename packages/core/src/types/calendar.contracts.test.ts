import { faker } from "@faker-js/faker";
import {
  type CalendarAccess,
  CalendarListResponseSchema,
  CalendarSchema,
  CONFERENCE_BY_PROVIDER,
  conferenceForDestination,
  conferenceForProvider,
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

    it("accepts createsGoogleMeet and omits it when absent", () => {
      expect(CalendarSchema.parse(validCalendar).createsGoogleMeet).toBe(
        undefined,
      );
      expect(
        CalendarSchema.parse({ ...validCalendar, createsGoogleMeet: false })
          .createsGoogleMeet,
      ).toBe(false);
    });

    it("accepts conference and omits it when absent", () => {
      expect(CalendarSchema.parse(validCalendar).conference).toBe(undefined);
      expect(
        CalendarSchema.parse({ ...validCalendar, conference: "teams" })
          .conference,
      ).toBe("teams");
    });
  });

  describe("conferenceForProvider", () => {
    it("maps every provider through CONFERENCE_BY_PROVIDER", () => {
      expect(conferenceForProvider("google")).toBe("meet");
      expect(conferenceForProvider("microsoft")).toBe("teams");
      expect(conferenceForProvider("apple")).toBe("none");
      expect(conferenceForProvider("local")).toBe("none");
      expect(CONFERENCE_BY_PROVIDER.google).toBe("meet");
    });

    it("returns none when the calendar cannot create a conference", () => {
      expect(conferenceForProvider("google", false)).toBe("none");
      expect(conferenceForProvider("microsoft", false)).toBe("none");
    });
  });

  describe("conferenceForDestination", () => {
    it("requires createTeamsMeeting for a Microsoft destination", () => {
      expect(
        conferenceForDestination("microsoft", true, [
          "readEvents",
          "writeEvents",
          "createTeamsMeeting",
        ]),
      ).toBe("teams");
      expect(
        conferenceForDestination("microsoft", true, [
          "readEvents",
          "writeEvents",
        ]),
      ).toBe("none");
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
        canInviteAttendees: true,
        conferenceKinds: [],
      });
    });

    it("returns write-but-not-manage capabilities for a writer", () => {
      expect(getCalendarCapabilities("writer")).toEqual({
        canReadAvailability: true,
        canReadDetails: true,
        canWrite: true,
        canManage: false,
        canWatchEvents: true,
        canInviteAttendees: true,
        conferenceKinds: [],
      });
    });

    it("returns read-only capabilities for a reader", () => {
      expect(getCalendarCapabilities("reader")).toEqual({
        canReadAvailability: true,
        canReadDetails: true,
        canWrite: false,
        canManage: false,
        canWatchEvents: true,
        canInviteAttendees: false,
        conferenceKinds: [],
      });
    });

    it("returns availability-only capabilities for a freeBusyReader", () => {
      expect(getCalendarCapabilities("freeBusyReader")).toEqual({
        canReadAvailability: true,
        canReadDetails: false,
        canWrite: false,
        canManage: false,
        canWatchEvents: false,
        canInviteAttendees: false,
        conferenceKinds: [],
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
