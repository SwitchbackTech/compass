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

mock.module("@web/common/storage/adapter/adapter", () => ({
  getStorageAdapter: () => ({
    putEvent,
    getAllEvents,
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

  it("shapes local calendar reads like backend reads", async () => {
    const baseEvent = makeEvent({
      _id: "base-event",
      recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
    });
    const instanceEvent = makeEvent({
      _id: "instance-event",
      recurrence: { eventId: "base-event" },
    });
    const somedayEvent = makeEvent({
      _id: "someday-event",
      isSomeday: true,
    });
    getAllEvents.mockResolvedValue([baseEvent, instanceEvent, somedayEvent]);

    const result = await new LocalEventRepository().get({
      startDate: "2026-05-05T00:00:00.000Z",
      endDate: "2026-05-06T00:00:00.000Z",
      someday: false,
    });

    expect(result.data.map((event) => event._id)).toEqual(["instance-event"]);
    expect(result.data[0]?.recurrence).toEqual({
      eventId: "base-event",
      rule: ["RRULE:FREQ=WEEKLY"],
    });
  });
});
