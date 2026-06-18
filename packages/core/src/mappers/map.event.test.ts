import { ObjectId } from "bson";
import { Origin, Priorities } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockInstance,
} from "@core/util/test/ccal.event.factory";

describe("MapEvent.removeProviderData", () => {
  it("removes gEventId from a base event", () => {
    const _id = new ObjectId().toString();
    const event = createMockBaseEvent({ _id, gEventId: _id });
    const result = MapEvent.removeProviderData(event);

    expect((result as Schema_Event).gEventId).toBeUndefined();
  });

  it("removes gEventId, gRecurringEventId and recurrence eventId from an instance event", () => {
    const _id = new ObjectId().toString();
    const event = createMockInstance(_id, _id);
    const result = MapEvent.removeProviderData(event);

    expect((result as Schema_Event).gEventId).toBeUndefined();
    expect((result as Schema_Event).gRecurringEventId).toBeUndefined();
    expect((result as Schema_Event).recurrence?.eventId).toBeUndefined();
  });
});

describe("MapEvent.toSomeday", () => {
  const baseEvent: Schema_Event = {
    _id: "event-1",
    title: "Grid event",
    startDate: "2024-03-19T10:00:00.000Z",
    endDate: "2024-03-19T11:00:00.000Z",
    isAllDay: false,
    isSomeday: false,
    origin: Origin.COMPASS,
    priority: Priorities.WORK,
    user: "user-1",
  };

  it("maps a calendar event into a someday payload with the given dates", () => {
    const result = MapEvent.toSomeday(baseEvent, {
      category: Categories_Event.SOMEDAY_WEEK,
      endDate: "2024-03-23",
      order: 2,
      startDate: "2024-03-17",
    });

    expect(result).toEqual(
      expect.objectContaining({
        _id: "event-1",
        endDate: "2024-03-23",
        isAllDay: false,
        isSomeday: true,
        order: 2,
        priority: Priorities.WORK,
        startDate: "2024-03-17",
        title: "Grid event",
      }),
    );
  });

  it("rewrites the recurrence FREQ for the destination list", () => {
    const result = MapEvent.toSomeday(
      { ...baseEvent, recurrence: { rule: ["RRULE:FREQ=DAILY;COUNT=5"] } },
      {
        category: Categories_Event.SOMEDAY_MONTH,
        endDate: "2024-03-31",
        order: 0,
        startDate: "2024-03-01",
      },
    );

    expect(result.recurrence?.rule).toEqual(["RRULE:FREQ=MONTHLY;COUNT=5"]);
  });

  it("defaults missing priority and user", () => {
    const result = MapEvent.toSomeday(
      {
        ...baseEvent,
        priority: undefined,
        user: undefined as unknown as string,
      },
      {
        category: Categories_Event.SOMEDAY_WEEK,
        endDate: "2024-03-23",
        order: 0,
        startDate: "2024-03-17",
      },
    );

    expect(result.priority).toBe(Priorities.UNASSIGNED);
    expect(result.user).toBe("");
  });
});
