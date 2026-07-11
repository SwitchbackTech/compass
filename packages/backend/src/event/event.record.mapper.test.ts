import { ObjectId } from "mongodb";
import { EventSchema } from "@core/types/event.contracts";
import { CreateEventInputSchema } from "@core/types/event-command.contracts";
import { type EventRecord } from "@backend/event/event.record";
import {
  mapCreateInput,
  mapEventRecord,
} from "@backend/event/event.record.mapper";

const buildRecord = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  _id: new ObjectId(),
  calendarId: new ObjectId(),
  content: { kind: "details", title: "Design review", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-07-14T15:00:00.000Z"),
    end: new Date("2026-07-14T16:00:00.000Z"),
    timeZone: "America/Denver",
  },
  recurrence: { kind: "single" },
  priority: "unassigned",
  externalReference: null,
  createdAt: new Date("2026-07-10T18:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

describe("mapEventRecord", () => {
  it("maps a timed event and produces output that passes EventSchema", () => {
    const record = buildRecord();
    const event = mapEventRecord(record);
    expect(() => EventSchema.parse(event)).not.toThrow();
    expect(event.id).toBe(record._id.toHexString());
    expect(event.calendarId).toBe(record.calendarId.toHexString());
    if (event.schedule.kind === "timed") {
      expect(event.schedule.start).toBe(record.schedule.start.toISOString());
      expect(event.schedule.end).toBe(record.schedule.end.toISOString());
    } else {
      throw new Error("expected timed schedule");
    }
    expect(event.createdAt).toBe(record.createdAt.toISOString());
    expect(event.updatedAt).toBeNull();
  });

  it("maps an all-day event unchanged", () => {
    const record = buildRecord({
      schedule: { kind: "allDay", start: "2026-08-03", end: "2026-08-06" },
    });
    const event = mapEventRecord(record);
    expect(() => EventSchema.parse(event)).not.toThrow();
    expect(event.schedule).toEqual({
      kind: "allDay",
      start: "2026-08-03",
      end: "2026-08-06",
    });
  });

  it("maps an occurrence recurrence seriesId to a hex string", () => {
    const seriesId = new ObjectId();
    const record = buildRecord({
      recurrence: { kind: "occurrence", seriesId },
    });
    const event = mapEventRecord(record);
    expect(() => EventSchema.parse(event)).not.toThrow();
    expect(event.recurrence).toEqual({
      kind: "occurrence",
      seriesId: seriesId.toHexString(),
    });
  });

  it("maps a non-null updatedAt", () => {
    const updatedAt = new Date("2026-07-11T00:00:00.000Z");
    const record = buildRecord({ updatedAt });
    const event = mapEventRecord(record);
    expect(event.updatedAt).toBe(updatedAt.toISOString());
  });
});

describe("mapCreateInput / mapEventRecord round trip", () => {
  const now = new Date("2026-07-10T18:00:00.000Z");

  it("round-trips a timed create input into an Event that passes EventSchema", () => {
    const input = CreateEventInputSchema.parse({
      calendarId: new ObjectId().toHexString(),
      content: { kind: "details", title: "Design review", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T09:00:00-06:00",
        end: "2026-07-14T10:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
      priority: "work",
    });

    const record = mapCreateInput(input, { now });
    const event = mapEventRecord(record);
    expect(() => EventSchema.parse(event)).not.toThrow();
    expect(event.calendarId).toBe(input.calendarId);
    expect(event.createdAt).toBe(now.toISOString());
    if (event.schedule.kind === "timed" && input.schedule.kind === "timed") {
      expect(new Date(event.schedule.start).getTime()).toBe(
        new Date(input.schedule.start).getTime(),
      );
      expect(new Date(event.schedule.end).getTime()).toBe(
        new Date(input.schedule.end).getTime(),
      );
    } else {
      throw new Error("expected timed schedule");
    }
  });

  it("echoes a client-supplied id", () => {
    const clientId = new ObjectId().toHexString();
    const input = CreateEventInputSchema.parse({
      id: clientId,
      calendarId: new ObjectId().toHexString(),
      content: { kind: "details", title: "Offline note", description: "" },
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
      recurrence: { kind: "single" },
      priority: "unassigned",
    });

    const record = mapCreateInput(input, { now });
    expect(record._id.toHexString()).toBe(clientId);

    const event = mapEventRecord(record);
    expect(event.id).toBe(clientId);
  });

  it("generates a new id when the client does not supply one", () => {
    const input = CreateEventInputSchema.parse({
      calendarId: new ObjectId().toHexString(),
      content: { kind: "details", title: "Offline note", description: "" },
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
      recurrence: { kind: "single" },
      priority: "unassigned",
    });

    const record = mapCreateInput(input, { now });
    expect(record._id).toBeInstanceOf(ObjectId);
  });
});
