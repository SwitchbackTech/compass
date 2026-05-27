import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import {
  applyWeekTimedDeckPosition,
  createWeekTimedEventLayout,
} from "@web/views/Week/utils/weekTimedOverlapLayout";

const createTimedEvent = (
  overrides: Partial<Schema_GridEvent> & {
    _id: string;
    endDate: string;
    startDate: string;
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

describe("weekTimedOverlapLayout", () => {
  it("keeps the Week layout wrapper names working", () => {
    const items = createWeekTimedEventLayout([
      createTimedEvent({
        _id: "first",
        endDate: "2026-05-20T10:00:00",
        startDate: "2026-05-20T09:00:00",
      }),
      createTimedEvent({
        _id: "second",
        endDate: "2026-05-20T10:30:00",
        startDate: "2026-05-20T09:30:00",
      }),
    ]);

    expect(items.map((item) => item.deckLayout)).toEqual([
      { groupSize: 2, order: 0 },
      { groupSize: 2, order: 1 },
    ]);
  });

  it("keeps the Week deck-position wrapper name working", () => {
    const position = applyWeekTimedDeckPosition(
      { height: 60, left: 20, top: 30, width: 180 },
      { groupSize: 2, order: 1 },
    );

    expect(position.left).toBeGreaterThan(20);
    expect(position.zIndex).toBe(2);
  });
});
