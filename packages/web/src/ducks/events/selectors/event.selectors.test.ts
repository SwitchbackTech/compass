import { type Schema_Event } from "@core/types/event.types";
import { type RootState } from "@web/store";
import { selectGridEvents } from "./event.selectors";
import { describe, expect, it } from "bun:test";

const createTimedEvent = (
  _id: string,
  startDate: string,
  endDate: string,
): Schema_Event => ({
  _id,
  endDate,
  isAllDay: false,
  startDate,
  title: _id,
});

const createWeekState = (events: Schema_Event[]) =>
  ({
    events: {
      entities: {
        value: Object.fromEntries(events.map((event) => [event._id, event])),
      },
      getWeekEvents: {
        value: {
          data: events.map((event) => event._id),
        },
      },
    },
  }) as unknown as RootState;

describe("event selectors", () => {
  it("returns memoized overlap-adjusted timed week events", () => {
    const state = createWeekState([
      createTimedEvent(
        "event-a",
        "2026-05-13T09:00:00.000Z",
        "2026-05-13T10:00:00.000Z",
      ),
      createTimedEvent(
        "event-b",
        "2026-05-13T09:30:00.000Z",
        "2026-05-13T10:30:00.000Z",
      ),
    ]);

    const first = selectGridEvents(state);
    const second = selectGridEvents(state);

    expect(first).toBe(second);
    expect(first).toHaveLength(2);
    expect(first.every((event) => event.position.isOverlapping)).toBe(true);
  });
});
