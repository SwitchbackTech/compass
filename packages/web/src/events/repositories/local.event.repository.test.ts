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

const fakeStore = {
  putEvent,
  getAllEvents,
} as unknown as OfflineDataStore;

const repository = new LocalEventRepository(() => fakeStore);

describe("LocalEventRepository", () => {
  beforeEach(() => {
    putEvent.mockClear();
    getAllEvents.mockClear();
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
});
