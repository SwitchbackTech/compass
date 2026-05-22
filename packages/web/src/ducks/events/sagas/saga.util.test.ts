import { put } from "redux-saga/effects";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  type Schema_GridEvent,
  type WithId,
} from "@web/common/types/web.event.types";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { describe, expect, it, mock } from "bun:test";

mock.module("@web/common/classes/Session", () => ({
  session: {
    doesSessionExist: mock(),
  },
}));

mock.module("@web/common/repositories/event/event.repository.util", () => ({
  getEventRepository: mock(),
}));

mock.module("@web/common/utils/event/event.util", () => ({
  addId: (event: Schema_GridEvent) => ({ ...event, _id: "event-1" }),
  assembleGridEvent: (event: Schema_GridEvent) => event,
  hasEventDates: (event: Schema_GridEvent) =>
    typeof event.startDate === "string" && typeof event.endDate === "string",
}));

const { insertOptimisticEvent } =
  require("./saga.util") as typeof import("./saga.util");

describe("insertOptimisticEvent", () => {
  it("stores a converted Someday event before adding its id to the Someday list", () => {
    const event: WithId<Schema_GridEvent> = {
      _id: "event-1",
      endDate: "2026-05-18",
      isAllDay: false,
      isSomeday: true,
      order: 0,
      origin: Origin.COMPASS,
      position: {
        dragOffset: { x: 0, y: 0 },
        horizontalOrder: 1,
        initialX: null,
        initialY: null,
        isOverlapping: false,
        totalEventsInGroup: 1,
        widthMultiplier: 1,
      },
      priority: Priorities.UNASSIGNED,
      startDate: "2026-05-11",
      title: "Moved to sidebar",
      user: "user-1",
    };

    const iterator = insertOptimisticEvent(event, true);

    expect(iterator.next().value).toEqual(
      put(
        eventsEntitiesSlice.actions.insert({
          [event._id]: event,
        }),
      ),
    );
    expect(iterator.next().value).toEqual(
      put(getSomedayEventsSlice.actions.insert(event._id)),
    );
  });
});
