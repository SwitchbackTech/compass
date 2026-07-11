import { ObjectId as BsonObjectId } from "bson";
import { ObjectId } from "mongodb";
import {
  CalendarRecordSchema,
  CalendarSourceRecordSchema,
  GoogleCalendarSourceRecordSchema,
  LocalCalendarSourceRecordSchema,
} from "@backend/calendar/calendar.record";

const baseRecord = () => ({
  _id: new ObjectId(),
  userId: new ObjectId(),
  name: "Work",
  description: "",
  timeZone: "America/Denver",
  foregroundColor: "#ffffff",
  backgroundColor: "#5b6cff",
  access: "owner" as const,
  isPrimary: false,
  isVisible: true,
  isActive: true,
  source: { provider: "local" as const },
  createdAt: new Date(),
  updatedAt: null,
});

describe("CalendarSourceRecordSchema", () => {
  it("parses a local source", () => {
    const result = LocalCalendarSourceRecordSchema.safeParse({
      provider: "local",
    });
    expect(result.success).toBe(true);
  });

  it("parses a google source", () => {
    const result = GoogleCalendarSourceRecordSchema.safeParse({
      provider: "google",
      calendarId: "gcal-1",
      etag: "etag-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown keys", () => {
    const result = CalendarSourceRecordSchema.safeParse({
      provider: "local",
      extra: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("CalendarRecordSchema", () => {
  it("parses a valid local calendar record", () => {
    const result = CalendarRecordSchema.safeParse(baseRecord());
    expect(result.success).toBe(true);
  });

  it("parses a valid google calendar record", () => {
    const result = CalendarRecordSchema.safeParse({
      ...baseRecord(),
      access: "writer",
      source: {
        provider: "google",
        calendarId: "gcal-1",
        etag: "etag-1",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a local-source calendar with non-owner access", () => {
    const result = CalendarRecordSchema.safeParse({
      ...baseRecord(),
      access: "writer",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["access"]);
    }
  });

  it("rejects unknown keys", () => {
    const result = CalendarRecordSchema.safeParse({
      ...baseRecord(),
      extra: "nope",
    });
    expect(result.success).toBe(false);
  });

  it("transforms a 24-hex string _id into an ObjectId instance", () => {
    const hex = new ObjectId().toHexString();
    const result = CalendarRecordSchema.safeParse({
      ...baseRecord(),
      _id: hex,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data._id).toBeInstanceOf(BsonObjectId);
    }
  });

  it("accepts an ObjectId instance directly for _id", () => {
    const result = CalendarRecordSchema.safeParse(baseRecord());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data._id).toBeInstanceOf(BsonObjectId);
    }
  });
});
