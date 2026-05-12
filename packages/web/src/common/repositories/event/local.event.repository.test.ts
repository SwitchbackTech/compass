import { Origin, Priorities } from "@core/constants/core.constants";
import { type Event_Core } from "@core/types/event.types";
import { LocalEventRepository } from "@web/common/repositories/event/local.event.repository";
import {
  isLocalDemoEvent,
  markLocalDemoEvent,
} from "@web/common/storage/types/local-event.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const putEvent = mock();
const getAllEvents = mock();
const getEvents = mock();

mock.module("@web/common/storage/adapter/adapter", () => ({
  getStorageAdapter: () => ({
    getAllEvents,
    getEvents,
    putEvent,
  }),
}));

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
    getEvents.mockClear();
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

  it("repairs missing someday event order values when loading someday events", async () => {
    getEvents.mockResolvedValue([
      makeEvent({
        _id: "event-1",
        isSomeday: true,
        title: "Learn a new shortcut",
      }),
      makeEvent({
        _id: "event-2",
        isSomeday: true,
        order: 1,
        title: "zz smoke week",
      }),
      makeEvent({
        _id: "event-3",
        isSomeday: true,
        order: 2,
        title: "aa smoke week",
      }),
    ]);

    const result = await new LocalEventRepository().get({
      endDate: "2026-05-16",
      someday: true,
      startDate: "2026-05-10",
    });

    expect(result.data.map((event) => event.title)).toEqual([
      "Learn a new shortcut",
      "zz smoke week",
      "aa smoke week",
    ]);
    expect(putEvent).toHaveBeenCalledTimes(1);
    expect(putEvent.mock.calls[0][0]).toEqual(
      expect.objectContaining({ _id: "event-1", order: 0 }),
    );
  });
});
