import { Priorities } from "@core/constants/core.constants";
import { type EventId } from "@core/types/domain-primitives";
import { createMockLocalEventRecord } from "@web/__tests__/utils/factories/event.factory";
import {
  type OfflineDataStore,
  setOfflineDataStoreTestOverrides,
} from "@web/common/storage/offline-data/offline-data.store.registry";
import { LocalEventRepository } from "@web/events/repositories/local.event.repository";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const putEvent = mock();
const getAllEvents = mock();
const updateEventOrders = mock();

// setOfflineDataStoreTestOverrides is a runtime override read at call time
// by the real registry module, not a `mock.module` swap — it works
// regardless of which files already imported the registry (see
// offline-data.store.registry.ts). The shared web.preload.ts afterEach
// clears overrides after every test, so this file re-applies its own in
// `beforeEach`.
const fakeStore = {
  putEvent,
  getAllEvents,
  updateEventOrders,
} as unknown as OfflineDataStore;

const registerOfflineDataStoreMock = () =>
  setOfflineDataStoreTestOverrides({
    getOfflineDataStore: () => fakeStore,
  });

registerOfflineDataStoreMock();

describe("LocalEventRepository", () => {
  beforeEach(() => {
    registerOfflineDataStoreMock();
    putEvent.mockClear();
    getAllEvents.mockClear();
    updateEventOrders.mockClear();
  });

  it("preserves the demo marker when replacing a seeded demo event", async () => {
    const existing = createMockLocalEventRecord({}, true);
    getAllEvents.mockResolvedValue([existing]);

    await new LocalEventRepository().replace(existing.id, {
      content: { kind: "details", title: "Renamed sample", description: "" },
      schedule: existing.event.schedule,
      recurrence: { kind: "preserve" },
      priority: existing.event.priority,
      scope: "this",
    });

    expect(putEvent.mock.calls[0][0].isDemo).toBe(true);
  });

  it("delegates reorder to the store without reading or rewriting whole events", async () => {
    const items = [
      { eventId: "a".repeat(24) as EventId, sortOrder: 0 },
      { eventId: "b".repeat(24) as EventId, sortOrder: 1 },
    ];

    await new LocalEventRepository().reorder({ period: "week", items });

    expect(updateEventOrders).toHaveBeenCalledWith(items);
    expect(getAllEvents).not.toHaveBeenCalled();
    expect(putEvent).not.toHaveBeenCalled();
  });

  it("throws when replacing an event that does not exist locally", async () => {
    getAllEvents.mockResolvedValue([]);

    await expect(
      new LocalEventRepository().replace("c".repeat(24) as EventId, {
        content: { kind: "details", title: "x", description: "" },
        schedule: {
          kind: "timed",
          start: "2026-05-05T09:00:00.000-05:00",
          end: "2026-05-05T10:00:00.000-05:00",
          timeZone: "America/Chicago",
        } as unknown as Parameters<
          LocalEventRepository["replace"]
        >[1]["schedule"],
        recurrence: { kind: "single" },
        priority: Priorities.UNASSIGNED,
        scope: "this",
      }),
    ).rejects.toThrow();
  });
});
