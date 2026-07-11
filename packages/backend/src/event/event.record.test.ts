import { ObjectId as BsonObjectId } from "bson";
import { ObjectId } from "mongodb";
import { EventRecordSchema } from "@backend/event/event.record";

const baseFields = () => ({
  _id: new ObjectId(),
  calendarId: new ObjectId(),
  priority: "unassigned" as const,
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

  it("parses a someday occurrence event with a busy content", () => {
    const result = EventRecordSchema.safeParse({
      ...baseFields(),
      content: { kind: "busy" },
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
      recurrence: { kind: "occurrence", seriesId: new ObjectId() },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown keys", () => {
    const result = EventRecordSchema.safeParse({
      ...baseFields(),
      content: { kind: "busy" },
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
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
    const hex = new ObjectId().toHexString();
    const result = EventRecordSchema.safeParse({
      ...baseFields(),
      _id: hex,
      calendarId: hex,
      content: { kind: "busy" },
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
      recurrence: { kind: "single" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data._id).toBeInstanceOf(BsonObjectId);
      expect(result.data.calendarId).toBeInstanceOf(BsonObjectId);
    }
  });

  it("parses a valid external reference and rejects an invalid one", () => {
    const valid = EventRecordSchema.safeParse({
      ...baseFields(),
      content: { kind: "busy" },
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
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
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
      recurrence: { kind: "single" },
      externalReference: { provider: "google", eventId: "" },
    });
    expect(invalid.success).toBe(false);
  });
});
