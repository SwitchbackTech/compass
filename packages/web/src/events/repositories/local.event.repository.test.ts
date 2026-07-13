import { Priorities } from "@core/constants/core.constants";
import {
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
      priority: existing.event.priority,
      scope: "this",
    });

    expect(putEvent.mock.calls[0][0].isDemo).toBe(true);
  });

  it("throws when replacing an event that does not exist locally", async () => {
    getAllEvents.mockResolvedValue([]);

    await expect(
      repository.replace("c".repeat(24) as EventId, {
        content: { kind: "details", title: "x", description: "" },
        schedule: {
          kind: "timed",
          start: DateTimeSchema.parse("2026-05-05T09:00:00.000-05:00"),
          end: DateTimeSchema.parse("2026-05-05T10:00:00.000-05:00"),
          timeZone: TimeZoneSchema.parse("America/Chicago"),
        },
        recurrence: { kind: "single" },
        priority: Priorities.UNASSIGNED,
        scope: "this",
      }),
    ).rejects.toThrow();
  });
});
