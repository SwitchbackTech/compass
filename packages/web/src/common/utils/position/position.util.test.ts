import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  getAllDayEventWidth,
  getEventCategory,
  getLeftPosition,
  getTimedEventPosition,
  widthMinusPadding,
} from "@web/common/utils/position/position.util";
import {
  DECK_INDENT,
  DECK_MIN_WIDTH,
  DECK_RIGHT_RESERVE,
  EVENT_WIDTH_MINIMUM,
  GRID_MARGIN_LEFT,
  TIMED_EVENT_COLUMN_INSET,
} from "@web/views/Week/layout.constants";

const createTimedEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent =>
  ({
    _id: "timed-event",
    endDate: "2022-02-22T16:00:00.000Z",
    isAllDay: false,
    isSomeday: false,
    position: {
      dragOffset: { x: 0, y: 0 },
      horizontalOrder: 1,
      initialX: null,
      initialY: null,
      isOverlapping: false,
      totalEventsInGroup: 1,
      widthMultiplier: 1,
    },
    recurrence: undefined,
    startDate: "2022-02-22T15:00:00.000Z",
    title: "Timed event",
    user: "user",
    ...overrides,
  }) as Schema_GridEvent;

describe("getAllDayEventWidth", () => {
  it("is never wider than 1 week", () => {
    const widths = [88, 89, 205, 178, 133, 132, 133];
    const _maxWidth = widths.reduce((a, b) => a + b, 0);
    const maxWidth = widthMinusPadding(_maxWidth);
    const start = dayjs("2022-02-20");
    const end = dayjs("2099-12-12");
    const startOfWeek = dayjs("2040-01-01");
    const endOfWeek = dayjs("2040-01-06");

    const category = getEventCategory(start, end, startOfWeek, endOfWeek);
    expect(
      getAllDayEventWidth(category, 0, start, end, startOfWeek, widths),
    ).toBeLessThanOrEqual(maxWidth);
  });

  it("handles events with same start & end date", () => {
    const start = dayjs("2022-03-15");
    const end = dayjs("2022-03-15"); // same day as start
    const startOfWeek = dayjs("2022-03-13");
    const endOfWeek = dayjs("2022-03-19");
    const category = getEventCategory(start, end, startOfWeek, endOfWeek);
    expect(
      getAllDayEventWidth(
        category,
        2,
        start,
        end,
        startOfWeek,
        [118, 117, 273, 237, 177, 176, 177],
      ),
    ).toBe(widthMinusPadding(273));
  });

  test("thisWeekOnly: 1 day", () => {
    const start = dayjs("2040-10-28");
    const end = dayjs("2040-10-29");
    const startOfWeek = dayjs("2040-10-28");
    const category = getEventCategory(
      start,
      end,
      startOfWeek,
      dayjs("2040-11-03"),
    );
    const sameDayEventWidth = getAllDayEventWidth(
      category,
      0,
      start,
      end,
      startOfWeek,
      [1, 0, 0, 0, 0, 0, 0],
    );
    expect(sameDayEventWidth).toBe(1);
  });

  test("thisToFutureWeek", () => {
    const start = dayjs("2040-10-17");
    const end = dayjs("2040-10-20");
    const startOfWeek = dayjs("2040-10-11");
    const endOfWeek = dayjs("2040-11-17");

    const category = getEventCategory(start, end, startOfWeek, endOfWeek);

    expect(
      getAllDayEventWidth(
        category,
        6,
        start,
        end,
        startOfWeek,
        [1, 1, 1, 1, 1, 1, 1],
      ),
    ).toBe(1);
  });

  test("pastToThisWeek", () => {
    const start = dayjs("2022-03-10");
    const end = dayjs("2022-03-16");
    const startOfWeek = dayjs("2022-03-13");
    const endOfWeek = dayjs("2022-03-19");
    const category = getEventCategory(start, end, startOfWeek, endOfWeek);
    expect(
      getAllDayEventWidth(
        category,
        -89, //this index shouldn't matter in this scenario
        start,
        end,
        startOfWeek,
        [1, 1, 1, 0, 0, 0, 0],
      ),
    ).toBe(3); // 13, 14, 15

    const start2 = dayjs("2022-02-17");
    const end2 = dayjs("2022-02-24");
    const startOfWeek2 = dayjs("2022-02-20");
    const endOfWeek2 = dayjs("2022-02-27");
    const category2 = getEventCategory(start2, end2, startOfWeek2, endOfWeek2);
    expect(
      getAllDayEventWidth(
        category2,
        4,
        start2,
        end2,
        startOfWeek2,
        [1, 1, 1, 1, 0, 0, 0],
      ),
      //20, 21, 23, 23
    ).toBe(4);
  });

  test("pastToThisWeek: month change", () => {
    const start = dayjs("2022-02-28");
    const end = dayjs("2022-03-08");
    const startOfWeek = dayjs("2022-03-06");
    const endOfWeek = dayjs("2022-03-12");
    const category = getEventCategory(start, end, startOfWeek, endOfWeek);

    expect(
      getAllDayEventWidth(
        category,
        1000, //this index shouldn't matter in this scenario
        start,
        end,
        startOfWeek,
        [1, 1, 0, 0, 0, 0, 0],
      ),
    ).toBe(2);
  });

  test("pastToFutureWeek", () => {
    const start = dayjs("2022-01-01");
    const end = dayjs("2022-03-06");
    const startOfWeek = dayjs("2022-03-12");
    const endOfWeek = dayjs("2022-12-30");

    const category = getEventCategory(start, end, startOfWeek, endOfWeek);
    expect(
      getAllDayEventWidth(
        category,
        0,
        start,
        end,
        startOfWeek,
        [1, 1, 1, 1, 1, 1, 1],
      ),
    ).toBe(7);
  });
});

describe("getTimedEventPosition", () => {
  it("keeps a timed event inset inside its day column", () => {
    const colWidth = 100;
    const startIndex = 2;
    const columnLeft = GRID_MARGIN_LEFT + colWidth * startIndex;
    const columnRight = columnLeft + colWidth;
    const position = getTimedEventPosition(
      createTimedEvent(),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
      {
        allDayRow: null,
        colWidths: Array(7).fill(colWidth),
        hourHeight: 60,
        mainGrid: null,
      },
      false,
    );

    expect(position.left).toBe(columnLeft + TIMED_EVENT_COLUMN_INSET);
    expect(position.width).toBe(colWidth - TIMED_EVENT_COLUMN_INSET * 2);
    expect(position.left).toBeGreaterThan(columnLeft);
    expect(position.left + position.width).toBeLessThan(columnRight);
  });

  describe("Deck overlap layout", () => {
    const measurements = (colWidth: number) => ({
      allDayRow: null,
      colWidths: Array(7).fill(colWidth),
      hourHeight: 60,
      mainGrid: null,
    });
    const startOfView = dayjs("2022-02-20");
    const endOfView = dayjs("2022-02-26");

    const deckEvent = (order: number, groupSize: number) =>
      createTimedEvent({
        position: {
          dragOffset: { x: 0, y: 0 },
          horizontalOrder: 1,
          initialX: null,
          initialY: null,
          isOverlapping: false,
          totalEventsInGroup: 1,
          widthMultiplier: 1,
          deck: { order, groupSize },
        },
      } as Partial<Schema_GridEvent>);

    it("shrinks deck width by the reserve and (n-1) indents", () => {
      const colWidth = 200;
      const base = getTimedEventPosition(
        createTimedEvent(),
        startOfView,
        endOfView,
        measurements(colWidth),
        false,
      );
      const deck = getTimedEventPosition(
        deckEvent(0, 3),
        startOfView,
        endOfView,
        measurements(colWidth),
        false,
      );

      expect(deck.width).toBe(
        base.width - DECK_RIGHT_RESERVE - 2 * DECK_INDENT,
      );
    });

    it("indents left by order * DECK_INDENT and sets zIndex order+1", () => {
      const colWidth = 200;
      const back = getTimedEventPosition(
        deckEvent(0, 3),
        startOfView,
        endOfView,
        measurements(colWidth),
        false,
      );
      const front = getTimedEventPosition(
        deckEvent(2, 3),
        startOfView,
        endOfView,
        measurements(colWidth),
        false,
      );

      expect(front.left - back.left).toBe(2 * DECK_INDENT);
      expect(back.zIndex).toBe(1);
      expect(front.zIndex).toBe(3);
      expect(front.width).toBe(back.width);
    });

    it("does not apply legacy equal-split overlap math to deck cards", () => {
      const colWidth = 200;
      const legacyOverlapDeck = createTimedEvent({
        position: {
          dragOffset: { x: 0, y: 0 },
          horizontalOrder: 2,
          initialX: null,
          initialY: null,
          isOverlapping: true,
          totalEventsInGroup: 2,
          widthMultiplier: 0.5,
          deck: { order: 1, groupSize: 2 },
        },
      } as Partial<Schema_GridEvent>);

      const position = getTimedEventPosition(
        legacyOverlapDeck,
        startOfView,
        endOfView,
        measurements(colWidth),
        false,
      );
      const base = getTimedEventPosition(
        createTimedEvent(),
        startOfView,
        endOfView,
        measurements(colWidth),
        false,
      );

      expect(position.width).toBe(
        colWidth -
          TIMED_EVENT_COLUMN_INSET * 2 -
          DECK_RIGHT_RESERVE -
          DECK_INDENT,
      );
      expect(position.left).toBe(base.left + DECK_INDENT);
    });

    it("floors deck width at DECK_MIN_WIDTH for dense groups", () => {
      const colWidth = 150;
      const deck = getTimedEventPosition(
        deckEvent(0, 8),
        startOfView,
        endOfView,
        measurements(colWidth),
        false,
      );

      expect(deck.width).toBe(DECK_MIN_WIDTH);
    });

    it("caps deck width inside the usable column when the column is narrow", () => {
      const colWidth = EVENT_WIDTH_MINIMUM;
      const base = getTimedEventPosition(
        createTimedEvent(),
        startOfView,
        endOfView,
        measurements(colWidth),
        false,
      );
      const back = getTimedEventPosition(
        deckEvent(0, 2),
        startOfView,
        endOfView,
        measurements(colWidth),
        false,
      );
      const front = getTimedEventPosition(
        deckEvent(1, 2),
        startOfView,
        endOfView,
        measurements(colWidth),
        false,
      );

      expect(back.width).toBe(
        colWidth - TIMED_EVENT_COLUMN_INSET * 2 - DECK_INDENT,
      );
      expect(front.width).toBe(back.width);
      expect(front.left + front.width).toBe(base.left + base.width);
    });

    it("ignores deck while drafting (full-width column)", () => {
      const colWidth = 200;
      const drafting = getTimedEventPosition(
        deckEvent(2, 3),
        startOfView,
        endOfView,
        measurements(colWidth),
        true,
      );

      expect(drafting.zIndex).toBeUndefined();
      expect(drafting.width).toBe(colWidth - TIMED_EVENT_COLUMN_INSET * 2);
    });
  });
});

describe("getLeftPosition", () => {
  it("is not more than sum of 6 day widths", () => {
    const category = getEventCategory(
      dayjs("2022-02-26"),
      dayjs("2022-02-26"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
    );
    const lastDayOfWeek = getLeftPosition(category, 6, [1, 1, 1, 1, 1, 1, 900]);
    expect(lastDayOfWeek).toBe(6);
  });
  test("pastToThisWeek", () => {
    const category = getEventCategory(
      dayjs("2022-02-02"),
      dayjs("2022-02-23"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
    );

    expect(getLeftPosition(category, 9, [1, 1, 1, 1, 1, 1, 1])).toBe(0);
  });
  test("pastToFutureWeek", () => {
    const category = getEventCategory(
      dayjs("2019-11-11"),
      dayjs("2030-11-11"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
    );
    expect(getLeftPosition(category, 6, [1, 1, 1, 1, 1, 1, 1])).toBe(0);
  });
  test("thisWeekOnly", () => {
    const category1 = getEventCategory(
      dayjs("2022-02-20"),
      dayjs("2022-02-23"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
    );
    const beginningOfWeek = getLeftPosition(
      category1,
      0,
      [0, 0, 0, 0, 0, 0, 0],
    );
    expect(beginningOfWeek).toBe(0);

    const category2 = getEventCategory(
      dayjs("2022-02-24"),
      dayjs("2022-02-26"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
    );
    const midWeek = getLeftPosition(category2, 4, [1, 1, 1, 1, 0, 0, 0]);
    expect(midWeek).toBe(4);

    const category3 = getEventCategory(
      dayjs("2022-02-26"),
      dayjs("2022-02-26"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
    );
    const endOfWeek = getLeftPosition(category3, 6, [1, 1, 1, 1, 1, 1, 900]);
    expect(endOfWeek).toBe(6);
  });

  test("thisToFutureWeek", () => {
    const category1 = getEventCategory(
      dayjs("2022-02-21"),
      dayjs("3000-03-03"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
    );
    const beginningOfWeek = getLeftPosition(
      category1,
      1,
      [1, 0, 0, 0, 0, 0, 0],
    );
    expect(beginningOfWeek).toBe(1);

    const category2 = getEventCategory(
      dayjs("2022-02-23"),
      dayjs("3000-03-03"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
    );
    const midWeek = getLeftPosition(category2, 4, [1, 1, 1, 1, 0, 0, 0]);
    expect(midWeek).toBe(4);

    const category3 = getEventCategory(
      dayjs("2022-02-25"),
      dayjs("3000-03-03"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
    );
    const endOfWeek = getLeftPosition(category3, 6, [1, 1, 1, 1, 1, 1, 0]);
    expect(endOfWeek).toBe(6);
  });
});
