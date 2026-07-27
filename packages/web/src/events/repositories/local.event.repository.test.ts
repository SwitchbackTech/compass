import {
  type CalendarId,
  DateTimeSchema,
  type EventId,
  TimeZoneSchema,
} from "@core/types/domain-primitives";
import { createMockLocalEventRecord } from "@web/__tests__/utils/factories/event.factory";
import { type OfflineDataStore } from "@web/common/storage/offline-data/offline-data.store.registry";
import { LocalEventRepository } from "@web/events/repositories/local.event.repository";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const putEvent = mock();
const getAllEvents = mock();
const deleteEvent = mock();

const fakeStore = {
  putEvent,
  getAllEvents,
  deleteEvent,
} as unknown as OfflineDataStore;

const repository = new LocalEventRepository(() => fakeStore);

describe("LocalEventRepository", () => {
  beforeEach(() => {
    putEvent.mockClear();
    getAllEvents.mockClear();
    deleteEvent.mockClear();
  });

  it("preserves the demo marker when replacing a seeded demo event", async () => {
    const existing = createMockLocalEventRecord({}, true);
    getAllEvents.mockResolvedValue([existing]);

    await repository.replace(existing.id, {
      content: { kind: "details", title: "Renamed sample", description: "" },
      schedule: existing.event.schedule,
      recurrence: { kind: "preserve" },
      scope: "this",
    });

    expect(putEvent.mock.calls[0][0].isDemo).toBe(true);
  });

  it("upserts (instead of throwing) when the edit target is absent from the store", async () => {
    // The optimistic layer can resolve an edit target from the query cache
    // that was never persisted to IndexedDB (e.g. a materialized recurring
    // occurrence). Replacing it must not throw "Event not found".
    getAllEvents.mockResolvedValue([]);

    const id = "c".repeat(24) as EventId;
    const result = await repository.replace(id, {
      content: { kind: "details", title: "x", description: "" },
      schedule: {
        kind: "timed",
        start: DateTimeSchema.parse("2026-05-05T09:00:00.000-05:00"),
        end: DateTimeSchema.parse("2026-05-05T10:00:00.000-05:00"),
        timeZone: TimeZoneSchema.parse("America/Chicago"),
      },
      recurrence: { kind: "single" },
      scope: "this",
    });

    expect(result.id).toBe(id);
    expect(putEvent).toHaveBeenCalledTimes(1);
    expect(putEvent.mock.calls[0][0]).toMatchObject({
      id,
      isDemo: false,
      event: { id, content: { title: "x" } },
    });
  });

  it("preserves the input calendar when replacing a missing event that carries one", async () => {
    getAllEvents.mockResolvedValue([]);

    const id = "d".repeat(24) as EventId;
    const calendarId = "e".repeat(24) as EventId;
    const result = await repository.replace(id, {
      content: { kind: "details", title: "y", description: "" },
      calendarId: calendarId as unknown as CalendarId,
      schedule: {
        kind: "timed",
        start: DateTimeSchema.parse("2026-05-05T09:00:00.000-05:00"),
        end: DateTimeSchema.parse("2026-05-05T10:00:00.000-05:00"),
        timeZone: TimeZoneSchema.parse("America/Chicago"),
      },
      recurrence: { kind: "single" },
      scope: "this",
    });

    expect(result.calendarId).toBe(calendarId as unknown as CalendarId);
  });

  const rangeQuery = {
    kind: "range" as const,
    start: "2026-05-03T00:00:00.000Z" as never,
    end: "2026-05-10T00:00:00.000Z" as never,
  };

  const seriesRecord = (isDemo = false) =>
    createMockLocalEventRecord(
      {
        schedule: {
          kind: "timed",
          start: DateTimeSchema.parse("2026-05-04T09:00:00.000Z"),
          end: DateTimeSchema.parse("2026-05-04T10:00:00.000Z"),
          timeZone: TimeZoneSchema.parse("UTC"),
        },
        recurrence: {
          kind: "series",
          rules: ["RRULE:FREQ=DAILY;COUNT=10"] as never,
        },
      },
      isDemo,
    );

  it("expands a stored series into range-bound occurrences at read time", async () => {
    const record = seriesRecord(true);
    getAllEvents.mockResolvedValue([record]);

    const events = await repository.list(rangeQuery as never);

    const instances = events.filter(
      (event) => event.recurrence.kind === "occurrence",
    );
    // Daily from May 4 bounded by the range end (May 10): 6 occurrences.
    expect(instances).toHaveLength(6);
    expect(new Date(instances[0]!.schedule.start).toISOString()).toBe(
      "2026-05-04T09:00:00.000Z",
    );
    expect(String(instances[0]!.id)).toBe(
      `${record.id}::${instances[0]!.schedule.start}`,
    );
    // The base rides along for series metadata (the grid never renders it).
    expect(events.some((event) => event.id === record.id)).toBe(true);
  });

  it("skips excluded dates and defers to stored occurrence overrides", async () => {
    const record = seriesRecord();
    getAllEvents.mockResolvedValue([record]);
    const base = await repository.list(rangeQuery as never);
    const [first, second] = base.filter(
      (event) => event.recurrence.kind === "occurrence",
    );

    const override = {
      version: 2 as const,
      id: second!.id,
      event: {
        ...second!,
        content: {
          kind: "details" as const,
          title: "Edited occurrence",
          description: "",
        },
      },
      isDemo: false,
    };
    getAllEvents.mockResolvedValue([
      { ...record, exdates: [first!.schedule.start as string] },
      override,
    ]);

    const events = await repository.list(rangeQuery as never);

    expect(events.some((event) => event.id === first!.id)).toBe(false);
    const kept = events.find((event) => event.id === second!.id);
    expect(kept?.content).toMatchObject({ title: "Edited occurrence" });
    expect(events.filter((event) => event.id === second!.id)).toHaveLength(1);
  });

  it("delete scope this excludes the occurrence and drops its override", async () => {
    const record = seriesRecord();
    getAllEvents.mockResolvedValue([record]);
    const occurrenceStart = "2026-05-06T09:00:00Z";
    const id = `${record.id}::${occurrenceStart}` as EventId;

    await repository.delete(id, "this");

    expect(deleteEvent).toHaveBeenCalledWith(id);
    expect(putEvent.mock.calls[0][0]).toMatchObject({
      id: record.id,
      exdates: [occurrenceStart],
    });
  });

  it("delete scope thisAndFollowing truncates the series rules", async () => {
    const record = seriesRecord();
    getAllEvents.mockResolvedValue([record]);
    const id = `${record.id}::2026-05-06T09:00:00Z` as EventId;

    await repository.delete(id, "thisAndFollowing");

    expect(deleteEvent).not.toHaveBeenCalled();
    const saved = putEvent.mock.calls[0][0];
    expect(saved.event.recurrence.rules).toEqual([
      "RRULE:FREQ=DAILY;UNTIL=20260506T085959Z",
    ]);
  });

  it("delete scope thisAndFollowing on the first occurrence removes the series", async () => {
    const record = seriesRecord();
    getAllEvents.mockResolvedValue([record]);
    const id = `${record.id}::2026-05-04T09:00:00.000Z` as EventId;

    await repository.delete(id, "thisAndFollowing");

    expect(deleteEvent).toHaveBeenCalledWith(record.id);
    expect(putEvent).not.toHaveBeenCalled();
  });

  it("delete scope all through an occurrence removes the series record", async () => {
    const record = seriesRecord();
    getAllEvents.mockResolvedValue([record]);

    await repository.delete(
      `${record.id}::2026-05-06T09:00:00Z` as EventId,
      "all",
    );

    expect(deleteEvent).toHaveBeenCalledWith(record.id);
  });

  it("replace scope all through an occurrence rewrites the series record", async () => {
    const record = seriesRecord();
    getAllEvents.mockResolvedValue([record]);

    const result = await repository.replace(
      `${record.id}::2026-05-06T09:00:00Z` as EventId,
      {
        content: { kind: "details", title: "Renamed series", description: "" },
        schedule: record.event.schedule,
        recurrence: {
          kind: "series",
          rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] as never,
        },
        scope: "all",
      },
    );

    expect(result.id).toBe(record.id);
    expect(putEvent.mock.calls[0][0]).toMatchObject({
      id: record.id,
      event: {
        content: { title: "Renamed series" },
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
      },
    });
  });

  it("replace scope thisAndFollowing splits the series", async () => {
    const record = seriesRecord();
    getAllEvents.mockResolvedValue([record]);
    const occurrenceStart = "2026-05-06T09:00:00Z";
    const id = `${record.id}::${occurrenceStart}` as EventId;

    const result = await repository.replace(id, {
      content: { kind: "details", title: "New leg", description: "" },
      schedule: {
        kind: "timed",
        start: DateTimeSchema.parse("2026-05-06T11:00:00.000Z"),
        end: DateTimeSchema.parse("2026-05-06T12:00:00.000Z"),
        timeZone: TimeZoneSchema.parse("UTC"),
      },
      recurrence: {
        kind: "series",
        rules: ["RRULE:FREQ=DAILY;COUNT=4"] as never,
      },
      scope: "thisAndFollowing",
    });

    expect(putEvent.mock.calls[0][0]).toMatchObject({
      id: record.id,
      event: {
        recurrence: {
          kind: "series",
          rules: ["RRULE:FREQ=DAILY;UNTIL=20260506T085959Z"],
        },
      },
    });
    expect(result.id).toBe(id);
    expect(putEvent.mock.calls[1][0]).toMatchObject({
      id,
      event: {
        id,
        content: { title: "New leg" },
        recurrence: { kind: "series", rules: ["RRULE:FREQ=DAILY;COUNT=4"] },
      },
    });
  });
});
