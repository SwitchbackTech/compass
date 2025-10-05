import { faker } from "@faker-js/faker";
import {
  CompassCalendarSchema,
  GoogleCalendarMetadataSchema,
} from "@core/types/calendar.types";
import { CalendarProvider } from "@core/types/event.types";
import { gSchema$CalendarListEntry } from "@core/types/gcal";

describe("Calendar Types", () => {
  const id = faker.internet.email();

  const gCalendar: gSchema$CalendarListEntry = {
    kind: "calendar#calendarListEntry",
    etag: faker.string.ulid(),
    id,
    summary: faker.lorem.sentence(),
    summaryOverride: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    location: faker.location.city(),
    accessRole: "owner",
    primary: faker.datatype.boolean(),
    selected: faker.datatype.boolean(),
    backgroundColor: faker.color.rgb(),
    foregroundColor: faker.color.rgb(),
    timeZone: faker.location.timeZone(),
    conferenceProperties: {
      allowedConferenceSolutionTypes: ["hangoutsMeet"],
    },
    defaultReminders: [
      { method: "email", minutes: 30 },
      { method: "popup", minutes: 10 },
    ],
    notificationSettings: {
      notifications: [
        { type: "eventCreation", method: "email" },
        { type: "agenda", method: "email" },
      ],
    },
  };

  describe("GoogleCalendarMetadataSchema", () => {
    it("parses valid metadata", () => {
      expect(() => GoogleCalendarMetadataSchema.parse(gCalendar)).not.toThrow();
    });

    it("allows optional fields to be missing", () => {
      const calendar = {
        ...gCalendar,
        summaryOverride: undefined,
        description: undefined,
        location: undefined,
        notificationSettings: undefined,
      };

      expect(() => GoogleCalendarMetadataSchema.parse(calendar)).not.toThrow();
    });

    it("always sets the calendar provider as google", () => {
      const result = GoogleCalendarMetadataSchema.safeParse(gCalendar);

      expect(result.success).toBe(true);
      expect(result.data?.provider).toBe(CalendarProvider.GOOGLE);
    });
  });

  describe("CompassCalendarSchema", () => {
    const compassCalendar = {
      _id: faker.database.mongodbObjectId(),
      user: faker.database.mongodbObjectId(),
      backgroundColor: gCalendar.backgroundColor!,
      color: gCalendar.foregroundColor!,
      primary: gCalendar.primary!,
      selected: gCalendar.selected!,
      timezone: gCalendar.timeZone!,
      createdAt: new Date(),
      metadata: gCalendar,
    };

    it("parses valid calendar", () => {
      expect(() => CompassCalendarSchema.parse(compassCalendar)).not.toThrow();
    });

    it("defaults selected and primary to false if not provided", () => {
      const calendar = {
        ...compassCalendar,
        selected: undefined,
        primary: undefined,
      };

      const parsed = CompassCalendarSchema.parse(calendar);

      expect(parsed.selected).toBe(true);
      expect(parsed.primary).toBe(false);
    });

    it("defaults createdAt to new date if not provided", () => {
      const calendar = { ...compassCalendar, createdAt: undefined };

      const parsed = CompassCalendarSchema.parse(calendar);

      expect(parsed.createdAt).toBeInstanceOf(Date);
    });

    it("rejects invalid _id", () => {
      const invalid = { ...compassCalendar, _id: "not-an-objectid" };

      expect(() => CompassCalendarSchema.parse(invalid)).toThrow();
    });

    it("rejects invalid timezone", () => {
      const invalid = { ...compassCalendar, timezone: "Invalid/Zone" };

      expect(() => CompassCalendarSchema.parse(invalid)).toThrow();
    });
  });
});
