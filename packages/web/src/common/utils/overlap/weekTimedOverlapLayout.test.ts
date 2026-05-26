import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { applyWeekTimedOverlapLayout } from "@web/common/utils/overlap/weekTimedOverlapLayout";

const defaultPosition = (): Schema_GridEvent["position"] => ({
  isOverlapping: false,
  totalEventsInGroup: 1,
  widthMultiplier: 1,
  horizontalOrder: 1,
  dragOffset: { x: 0, y: 0 },
  initialX: null,
  initialY: null,
  deck: null,
});

const createTimedEvent = (
  overrides: Partial<Schema_GridEvent> & {
    _id: string;
    startDate: string;
    endDate: string;
  },
): Schema_GridEvent => {
  const { position, ...rest } = overrides;
  return {
    isAllDay: false,
    isSomeday: false,
    recurrence: undefined,
    title: overrides._id,
    user: "user",
    ...rest,
    position: { ...defaultPosition(), ...position },
  } as Schema_GridEvent;
};

const deckOf = (events: Schema_GridEvent[], id: string) =>
  events.find((e) => e._id === id)?.position.deck ?? null;

describe("applyWeekTimedOverlapLayout", () => {
  it("decks two same-day overlapping events background-first", () => {
    const events = [
      createTimedEvent({
        _id: "early-long",
        startDate: "2024-01-15T18:30:00.000Z",
        endDate: "2024-01-15T20:00:00.000Z",
      }),
      createTimedEvent({
        _id: "later-short",
        startDate: "2024-01-15T19:00:00.000Z",
        endDate: "2024-01-15T19:45:00.000Z",
      }),
    ];

    const laid = applyWeekTimedOverlapLayout(events);

    // earliest start sits behind (order 0)
    expect(deckOf(laid, "early-long")).toEqual({ order: 0, groupSize: 2 });
    expect(deckOf(laid, "later-short")).toEqual({ order: 1, groupSize: 2 });
  });

  it("orders same-start events longest-first (longer sits behind)", () => {
    const events = [
      createTimedEvent({
        _id: "short",
        startDate: "2024-01-15T18:00:00.000Z",
        endDate: "2024-01-15T18:30:00.000Z",
      }),
      createTimedEvent({
        _id: "long",
        startDate: "2024-01-15T18:00:00.000Z",
        endDate: "2024-01-15T20:00:00.000Z",
      }),
    ];

    const laid = applyWeekTimedOverlapLayout(events);

    expect(deckOf(laid, "long")).toEqual({ order: 0, groupSize: 2 });
    expect(deckOf(laid, "short")).toEqual({ order: 1, groupSize: 2 });
  });

  it("treats a transitive chain (A∩B, B∩C, A∌C) as one group of three", () => {
    const events = [
      createTimedEvent({
        _id: "a",
        startDate: "2024-01-15T10:00:00.000Z",
        endDate: "2024-01-15T11:00:00.000Z",
      }),
      createTimedEvent({
        _id: "b",
        startDate: "2024-01-15T10:30:00.000Z",
        endDate: "2024-01-15T11:30:00.000Z",
      }),
      createTimedEvent({
        _id: "c",
        startDate: "2024-01-15T11:00:00.000Z",
        endDate: "2024-01-15T12:00:00.000Z",
      }),
    ];

    const laid = applyWeekTimedOverlapLayout(events);

    expect(deckOf(laid, "a")).toEqual({ order: 0, groupSize: 3 });
    expect(deckOf(laid, "b")).toEqual({ order: 1, groupSize: 3 });
    expect(deckOf(laid, "c")).toEqual({ order: 2, groupSize: 3 });
  });

  it("does not deck events on different days at the same clock time", () => {
    const events = [
      createTimedEvent({
        _id: "tue",
        startDate: "2024-01-16T10:00:00.000Z",
        endDate: "2024-01-16T11:00:00.000Z",
      }),
      createTimedEvent({
        _id: "wed",
        startDate: "2024-01-17T10:00:00.000Z",
        endDate: "2024-01-17T11:00:00.000Z",
      }),
    ];

    const laid = applyWeekTimedOverlapLayout(events);

    expect(deckOf(laid, "tue")).toBeNull();
    expect(deckOf(laid, "wed")).toBeNull();
  });

  it("leaves non-overlapping same-day events un-decked", () => {
    const events = [
      createTimedEvent({
        _id: "morning",
        startDate: "2024-01-15T09:00:00.000Z",
        endDate: "2024-01-15T10:00:00.000Z",
      }),
      createTimedEvent({
        _id: "afternoon",
        startDate: "2024-01-15T14:00:00.000Z",
        endDate: "2024-01-15T15:00:00.000Z",
      }),
    ];

    const laid = applyWeekTimedOverlapLayout(events);

    expect(deckOf(laid, "morning")).toBeNull();
    expect(deckOf(laid, "afternoon")).toBeNull();
  });

  it("does not mutate the input events", () => {
    const events = [
      createTimedEvent({
        _id: "a",
        startDate: "2024-01-15T10:00:00.000Z",
        endDate: "2024-01-15T11:00:00.000Z",
      }),
      createTimedEvent({
        _id: "b",
        startDate: "2024-01-15T10:30:00.000Z",
        endDate: "2024-01-15T11:30:00.000Z",
      }),
    ];

    applyWeekTimedOverlapLayout(events);

    expect(events[0].position.deck).toBeNull();
    expect(events[1].position.deck).toBeNull();
  });

  it("clears stale deck state from events that are no longer overlapping", () => {
    const events = [
      createTimedEvent({
        _id: "morning",
        startDate: "2024-01-15T09:00:00.000Z",
        endDate: "2024-01-15T10:00:00.000Z",
        position: { ...defaultPosition(), deck: { order: 0, groupSize: 2 } },
      }),
      createTimedEvent({
        _id: "afternoon",
        startDate: "2024-01-15T14:00:00.000Z",
        endDate: "2024-01-15T15:00:00.000Z",
        position: { ...defaultPosition(), deck: { order: 1, groupSize: 2 } },
      }),
    ];

    const laid = applyWeekTimedOverlapLayout(events);

    expect(deckOf(laid, "morning")).toBeNull();
    expect(deckOf(laid, "afternoon")).toBeNull();
  });
});
