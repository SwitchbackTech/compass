import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import {
  CALENDAR_DECK_INDENT,
  CALENDAR_DECK_MIN_WIDTH,
  CALENDAR_DECK_RIGHT_RESERVE,
  CALENDAR_EVENT_WIDTH_MINIMUM,
  CALENDAR_TIMED_EVENT_COLUMN_INSET,
  CALENDAR_TIMED_EVENT_FAN_GUTTER,
  CALENDAR_TIMED_EVENT_FAN_INDENT,
  CALENDAR_TIMED_EVENT_WIDTH_RATIO,
} from "@web/layout/calendar-grid/calendarGrid.constants";
import {
  applyCalendarTimedDeckPosition,
  applyCalendarTimedEventDisplayPosition,
  createCalendarTimedEventLayout,
} from "./calendarTimedDeckLayout";

const createTimedEvent = (
  overrides: Partial<Schema_GridEvent> & {
    _id: string;
    startDate: string;
    endDate: string;
  },
): Schema_GridEvent => ({
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  recurrence: undefined,
  title: overrides._id,
  user: "user",
  ...overrides,
  position: { ...gridEventDefaultPosition, ...overrides.position },
});

const event = (id: string, startDate: string, endDate: string) =>
  createTimedEvent({
    _id: id,
    endDate,
    startDate,
  });

const deckOf = (
  items: ReturnType<typeof createCalendarTimedEventLayout>,
  id: string,
) => items.find((item) => item.event._id === id)?.deckLayout ?? null;

describe("createCalendarTimedEventLayout", () => {
  it("decks overlapping events in a one-date calendar", () => {
    const items = createCalendarTimedEventLayout([
      event("first", "2026-05-20T09:00:00", "2026-05-20T10:00:00"),
      event("second", "2026-05-20T09:30:00", "2026-05-20T10:30:00"),
    ]);

    expect(items.map((item) => item.deckLayout)).toEqual([
      { groupSize: 2, order: 0 },
      { groupSize: 2, order: 1 },
    ]);
  });

  it("returns render-only deck layout for same-day overlapping events", () => {
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

    const laid = createCalendarTimedEventLayout(events);

    expect(deckOf(laid, "early-long")).toEqual({ order: 0, groupSize: 2 });
    expect(deckOf(laid, "later-short")).toEqual({ order: 1, groupSize: 2 });
    expect(laid[0].event).toBe(events[0]);
    expect(laid[1].event).toBe(events[1]);
  });

  it("orders same-start events longest-first", () => {
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

    const laid = createCalendarTimedEventLayout(events);

    expect(deckOf(laid, "long")).toEqual({ order: 0, groupSize: 2 });
    expect(deckOf(laid, "short")).toEqual({ order: 1, groupSize: 2 });
  });

  it("treats a transitive overlap chain as one group", () => {
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

    const laid = createCalendarTimedEventLayout(events);

    expect(deckOf(laid, "a")).toEqual({ order: 0, groupSize: 3 });
    expect(deckOf(laid, "b")).toEqual({ order: 1, groupSize: 3 });
    expect(deckOf(laid, "c")).toEqual({ order: 2, groupSize: 3 });
  });

  it("leaves non-overlapping events without deck layout", () => {
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

    const laid = createCalendarTimedEventLayout(events);

    expect(deckOf(laid, "morning")).toBeNull();
    expect(deckOf(laid, "afternoon")).toBeNull();
  });
});

describe("applyCalendarTimedDeckPosition", () => {
  const basePosition = { height: 60, left: 20, top: 30, width: 180 };

  it("shrinks deck width by the reserve and group indents", () => {
    const deck = applyCalendarTimedDeckPosition(basePosition, {
      order: 0,
      groupSize: 3,
    });

    expect(deck.width).toBe(
      basePosition.width -
        CALENDAR_DECK_RIGHT_RESERVE -
        2 * CALENDAR_DECK_INDENT,
    );
  });

  it("indents left by order and sets zIndex", () => {
    const back = applyCalendarTimedDeckPosition(basePosition, {
      order: 0,
      groupSize: 3,
    });
    const front = applyCalendarTimedDeckPosition(basePosition, {
      order: 2,
      groupSize: 3,
    });

    expect(front.left - back.left).toBe(2 * CALENDAR_DECK_INDENT);
    expect(back.zIndex).toBe(1);
    expect(front.zIndex).toBe(3);
    expect(front.width).toBe(back.width);
  });

  it("leaves a wider visible rail for cards behind a same-time overlap", () => {
    const back = applyCalendarTimedDeckPosition(basePosition, {
      order: 0,
      groupSize: 2,
    });
    const front = applyCalendarTimedDeckPosition(basePosition, {
      order: 1,
      groupSize: 2,
    });

    expect(front.left - back.left).toBe(CALENDAR_DECK_INDENT);
  });

  it("floors deck width for dense groups", () => {
    const deck = applyCalendarTimedDeckPosition(
      { ...basePosition, width: 150 - CALENDAR_TIMED_EVENT_COLUMN_INSET * 2 },
      { order: 0, groupSize: 8 },
    );

    expect(deck.width).toBe(CALENDAR_DECK_MIN_WIDTH);
  });

  it("keeps narrow-column decks inside the usable column", () => {
    const narrowBase = {
      ...basePosition,
      width:
        CALENDAR_EVENT_WIDTH_MINIMUM - CALENDAR_TIMED_EVENT_COLUMN_INSET * 2,
    };
    const back = applyCalendarTimedDeckPosition(narrowBase, {
      order: 0,
      groupSize: 2,
    });
    const front = applyCalendarTimedDeckPosition(narrowBase, {
      order: 1,
      groupSize: 2,
    });

    expect(back.width).toBe(narrowBase.width - CALENDAR_DECK_INDENT);
    expect(front.width).toBe(back.width);
    expect(front.left + front.width).toBe(narrowBase.left + narrowBase.width);
  });

  it("keeps dense narrow-column decks inside the usable column", () => {
    const narrowBase = {
      ...basePosition,
      width:
        CALENDAR_EVENT_WIDTH_MINIMUM - CALENDAR_TIMED_EVENT_COLUMN_INSET * 2,
    };
    const front = applyCalendarTimedDeckPosition(narrowBase, {
      order: 7,
      groupSize: 8,
    });

    expect(front.width).toBeGreaterThan(0);
    expect(front.left + front.width).toBe(narrowBase.left + narrowBase.width);
  });
});

describe("applyCalendarTimedEventDisplayPosition", () => {
  const widePosition = { height: 60, left: 20, top: 30, width: 1000 };

  it("sizes solo timed event cards proportionally to the column", () => {
    const position = applyCalendarTimedEventDisplayPosition(widePosition, null);

    expect(position.width).toBe(
      widePosition.width * CALENDAR_TIMED_EVENT_WIDTH_RATIO,
    );
  });

  it("keeps scaling solo cards on very wide columns without an upper cap", () => {
    const extraWide = { ...widePosition, width: 2400 };

    const position = applyCalendarTimedEventDisplayPosition(extraWide, null);

    expect(position.width).toBe(
      extraWide.width * CALENDAR_TIMED_EVENT_WIDTH_RATIO,
    );
  });

  it("fans overlapping cards farther without widening the cards", () => {
    const cardWidth = widePosition.width * CALENDAR_TIMED_EVENT_WIDTH_RATIO;
    const back = applyCalendarTimedEventDisplayPosition(widePosition, {
      order: 0,
      groupSize: 2,
    });
    const front = applyCalendarTimedEventDisplayPosition(widePosition, {
      order: 1,
      groupSize: 2,
    });

    expect(front.left - back.left).toBe(CALENDAR_TIMED_EVENT_FAN_INDENT);
    expect(back.width).toBe(
      cardWidth - CALENDAR_DECK_RIGHT_RESERVE - CALENDAR_DECK_INDENT,
    );
    expect(front.width).toBe(back.width);
  });

  it("keeps dense fans inside the right-side gutter", () => {
    const front = applyCalendarTimedEventDisplayPosition(widePosition, {
      order: 19,
      groupSize: 20,
    });

    expect(front.left + front.width).toBeLessThanOrEqual(
      widePosition.left + widePosition.width - CALENDAR_TIMED_EVENT_FAN_GUTTER,
    );
  });

  it("falls back to the available column width when the column is narrow", () => {
    const narrowPosition = { ...widePosition, width: 90 };
    const front = applyCalendarTimedEventDisplayPosition(narrowPosition, {
      order: 1,
      groupSize: 2,
    });

    expect(front.left + front.width).toBe(
      narrowPosition.left + narrowPosition.width,
    );
  });
});
