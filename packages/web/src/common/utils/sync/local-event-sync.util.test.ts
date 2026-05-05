import { Origin, Priorities } from "@core/constants/core.constants";
import { type Event_Core } from "@core/types/event.types";
import { EventApi } from "@web/ducks/events/event.api";
import { markLocalDemoEvent } from "../../storage/types/local-event.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const ensureStorageReady = mock();
const getAllEvents = mock();
const clearAllEvents = mock();
const create = mock();

mock.module("@web/common/storage/adapter/adapter", () => ({
  ensureStorageReady,
  getStorageAdapter: () => ({
    getAllEvents,
    clearAllEvents,
  }),
}));

mock.module("@web/ducks/events/event.api", () => ({
  EventApi: { create },
}));

const { syncLocalEventsToCloud } =
  require("./local-event-sync.util") as typeof import("./local-event-sync.util");

const makeEvent = (overrides: Partial<Event_Core> = {}): Event_Core => ({
  _id: overrides._id ?? "event-1",
  title: overrides.title ?? "User event",
  startDate: "2026-05-05T09:00:00.000Z",
  endDate: "2026-05-05T10:00:00.000Z",
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "unauthenticated",
  ...overrides,
});

describe("syncLocalEventsToCloud", () => {
  beforeEach(() => {
    ensureStorageReady.mockClear();
    getAllEvents.mockClear();
    clearAllEvents.mockClear();
    create.mockClear();
  });

  it("syncs user-created events and skips demo events", async () => {
    const userEvent = makeEvent({ _id: "user-event" });
    const demoEvent = markLocalDemoEvent(
      makeEvent({ _id: "demo-event", title: "Try Compass" }),
    );
    getAllEvents.mockResolvedValue([userEvent, demoEvent]);

    await expect(syncLocalEventsToCloud()).resolves.toBe(1);

    expect(EventApi.create).toHaveBeenCalledWith([userEvent]);
    expect(clearAllEvents).toHaveBeenCalledTimes(1);
  });

  it("clears local demo events without sending them to the backend", async () => {
    getAllEvents.mockResolvedValue([
      markLocalDemoEvent(makeEvent({ _id: "demo-event" })),
    ]);

    await expect(syncLocalEventsToCloud()).resolves.toBe(0);

    expect(EventApi.create).not.toHaveBeenCalled();
    expect(clearAllEvents).toHaveBeenCalledTimes(1);
  });
});
