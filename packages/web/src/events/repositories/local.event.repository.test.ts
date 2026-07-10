import { Origin, Priorities } from "@core/constants/core.constants";
import { type Event_Core } from "@core/types/event.types";
import {
  isLocalDemoEvent,
  markLocalDemoEvent,
} from "@web/common/storage/types/local-event.types";
import { LocalEventRepository } from "@web/events/repositories/local.event.repository";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const putEvent = mock();
const getAllEvents = mock();
const updateEventOrders = mock();

mock.module(
  "@web/common/storage/offline-data/offline-data.store.registry",
  () => ({
    ensureOfflineDataStoreReady: mock().mockResolvedValue(undefined),
    getOfflineDataStore: () => ({
      putEvent,
      getAllEvents,
      updateEventOrders,
    }),
    initializeOfflineDataStore: mock().mockResolvedValue(undefined),
    isOfflineDataStoreReady: mock().mockReturnValue(true),
    resetOfflineDataStore: mock(),
    resetOfflineDataStoreAsync: mock().mockResolvedValue(undefined),
  }),
);

const makeEvent = (overrides: Partial<Event_Core> = {}): Event_Core => ({
  _id: "event-1",
  title: "Morning standup",
  startDate: "2026-05-05T09:00:00.000Z",
  endDate: "2026-05-05T10:00:00.000Z",
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "unauthenticated",
  ...overrides,
});

describe("LocalEventRepository", () => {
  beforeEach(() => {
    putEvent.mockClear();
    getAllEvents.mockClear();
    updateEventOrders.mockClear();
  });

  it("preserves the demo marker when editing a seeded demo event", async () => {
    const existing = markLocalDemoEvent(makeEvent());
    getAllEvents.mockResolvedValue([existing]);

    await new LocalEventRepository().edit(
      "event-1",
      makeEvent({ title: "Renamed sample" }),
      {},
    );

    expect(isLocalDemoEvent(putEvent.mock.calls[0][0])).toBe(true);
  });

  it("delegates reorder to the store without reading or rewriting whole events", async () => {
    const order = [
      { _id: "event-1", order: 0 },
      { _id: "event-2", order: 1 },
    ];

    await new LocalEventRepository().reorder(order);

    expect(updateEventOrders).toHaveBeenCalledWith(order);
    expect(getAllEvents).not.toHaveBeenCalled();
    expect(putEvent).not.toHaveBeenCalled();
  });
});
