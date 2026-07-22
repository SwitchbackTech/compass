import { ObjectId } from "bson";
import { ObjectId as MongoObjectId } from "mongodb";
import { EventRecordSchema } from "@backend/event/event.record";
import { describe, expect, it } from "bun:test";

const baseFields = () => ({
  _id: new MongoObjectId(),
  calendarId: new MongoObjectId(),
  externalReference: null,
  createdAt: new Date(),
  updatedAt: null,
});

describe("EventRecordSchema", () => {
  it("parses a timed single event", () => {
    const result = EventRecordSchema.safeParse({
      ...baseFields(),
      content: { kind: "details", title: "Design review", description: "" },
      schedule: {
        kind: "timed",
        start: new Date("2026-07-14T15:00:00.000Z"),
        end: new Date("2026-07-14T16:00:00.000Z"),
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });
    expect(result.success).toBe(true);
  });

  it("parses an all-day series event", () => {
    const result = EventRecordSchema.safeParse({
      ...baseFields(),
      content: { kind: "details", title: "Retreat", description: "" },
      schedule: { kind: "allDay", start: "2026-08-03", end: "2026-08-06" },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
    });
    expect(result.success).toBe(true);
  });

  it("parses an all-day occurrence event with a busy content", () => {
    const result = EventRecordSchema.safeParse({
      ...baseFields(),
      content: { kind: "busy" },
      schedule: { kind: "allDay", start: "2026-07-13", end: "2026-07-14" },
      recurrence: { kind: "occurrence", seriesId: new MongoObjectId() },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown keys", () => {
    const result = EventRecordSchema.safeParse({
      ...baseFields(),
      content: { kind: "busy" },
      schedule: { kind: "allDay", start: "2026-07-13", end: "2026-07-14" },
      recurrence: { kind: "single" },
      extra: "nope",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a timed schedule where end is not after start", () => {
    const result = EventRecordSchema.safeParse({
      ...baseFields(),
      content: { kind: "busy" },
      schedule: {
        kind: "timed",
        start: new Date("2026-07-14T16:00:00.000Z"),
        end: new Date("2026-07-14T15:00:00.000Z"),
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });
    expect(result.success).toBe(false);
  });

  it("transforms 24-hex string ObjectId fields into ObjectId instances", () => {
    const hex = new MongoObjectId().toHexString();
    const result = EventRecordSchema.safeParse({
      ...baseFields(),
      _id: hex,
      calendarId: hex,
      content: { kind: "busy" },
      schedule: { kind: "allDay", start: "2026-07-13", end: "2026-07-14" },
      recurrence: { kind: "single" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(ObjectId.isValid(result.data._id.toString())).toBe(true);
      expect(ObjectId.isValid(result.data.calendarId.toString())).toBe(true);
    }
  });

  it("parses a valid external reference and rejects an invalid one", () => {
    const valid = EventRecordSchema.safeParse({
      ...baseFields(),
      content: { kind: "busy" },
      schedule: { kind: "allDay", start: "2026-07-13", end: "2026-07-14" },
      recurrence: { kind: "single" },
      externalReference: {
        provider: "google",
        eventId: "gevent-1",
        recurringEventId: null,
      },
    });
    expect(valid.success).toBe(true);

    const invalid = EventRecordSchema.safeParse({
      ...baseFields(),
      content: { kind: "busy" },
      schedule: { kind: "allDay", start: "2026-07-13", end: "2026-07-14" },
      recurrence: { kind: "single" },
      externalReference: { provider: "google", eventId: "" },
    });
    expect(invalid.success).toBe(false);
  });
});
