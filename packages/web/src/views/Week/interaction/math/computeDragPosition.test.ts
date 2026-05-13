import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import {
  computeDragHasMoved,
  computeDragPosition,
} from "./computeDragPosition";
import { describe, expect, it, mock } from "bun:test";

const createDraft = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  _id: "event-1",
  title: "Seed event",
  startDate: "2024-01-15T10:00:00.000Z",
  endDate: "2024-01-15T11:30:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "user-1",
  position: {
    isOverlapping: false,
    totalEventsInGroup: 1,
    widthMultiplier: 1,
    horizontalOrder: 1,
    dragOffset: { x: 0, y: 0 },
    initialX: null,
    initialY: null,
  },
  ...overrides,
});

describe("computeDragPosition", () => {
  it("snaps a timed drag to the date returned by the grid math", () => {
    const draft = createDraft({
      priority: undefined,
      position: {
        ...createDraft().position,
        dragOffset: { x: 12, y: 30 },
      },
    });
    const dateCalcs = {
      getDateByXY: mock(() => dayjs("2024-01-16T09:15:00.000Z")),
    } as unknown as DateCalcs;

    const result = computeDragPosition({
      dateCalcs,
      draft,
      dragStatus: null,
      pointer: { clientX: 120, clientY: 300 },
      startOfView: dayjs("2024-01-15T00:00:00.000Z"),
    });

    expect(dateCalcs.getDateByXY).toHaveBeenCalledWith(
      120,
      270,
      dayjs("2024-01-15T00:00:00.000Z"),
    );
    expect(result).toEqual({
      ...draft,
      startDate: "2024-01-16T09:15:00+00:00",
      endDate: "2024-01-16T10:45:00+00:00",
      priority: Priorities.UNASSIGNED,
    });
  });

  it("uses the tracked drag duration when the original draft duration has already collapsed", () => {
    const draft = createDraft({
      startDate: "2024-01-15T10:00:00.000Z",
      endDate: "2024-01-15T10:15:00.000Z",
    });
    const dateCalcs = {
      getDateByXY: mock(() => dayjs("2024-01-16T09:15:00.000Z")),
    } as unknown as DateCalcs;

    const result = computeDragPosition({
      dateCalcs,
      draft,
      dragStatus: { durationMin: 90 },
      pointer: { clientX: 120, clientY: 300 },
      startOfView: dayjs("2024-01-15T00:00:00.000Z"),
    });

    expect(result?.endDate).toBe("2024-01-16T10:45:00+00:00");
  });

  it("prevents timed drags from overflowing past midnight", () => {
    const draft = createDraft({
      startDate: "2024-01-15T21:00:00.000Z",
      endDate: "2024-01-15T22:30:00.000Z",
    });
    const dateCalcs = {
      getDateByXY: mock(() => dayjs("2024-01-15T23:15:00.000Z")),
    } as unknown as DateCalcs;

    const result = computeDragPosition({
      dateCalcs,
      draft,
      dragStatus: { durationMin: 90 },
      pointer: { clientX: 120, clientY: 300 },
      startOfView: dayjs("2024-01-15T00:00:00.000Z"),
    });

    expect(result?.startDate).toBe("2024-01-15T22:30:00+00:00");
    expect(result?.endDate).toBe("2024-01-16T00:00:00+00:00");
  });

  it("returns null when dragging snaps to the same timed instant", () => {
    const draft = createDraft();
    const dateCalcs = {
      getDateByXY: mock(() => dayjs("2024-01-15T04:00:00.000-06:00")),
    } as unknown as DateCalcs;

    const result = computeDragPosition({
      dateCalcs,
      draft,
      dragStatus: null,
      pointer: { clientX: 120, clientY: 300 },
      startOfView: dayjs("2024-01-15T00:00:00.000Z"),
    });

    expect(result).toBeNull();
  });

  it("uses the horizontal drag offset for all-day drag snapping", () => {
    const draft = createDraft({
      isAllDay: true,
      startDate: "2024-01-15",
      endDate: "2024-01-16",
      position: {
        ...createDraft().position,
        dragOffset: { x: 24, y: 10 },
      },
    });
    const dateCalcs = {
      getDateByXY: mock(() => dayjs("2024-01-17T00:00:00.000Z")),
    } as unknown as DateCalcs;

    const result = computeDragPosition({
      dateCalcs,
      draft,
      dragStatus: { durationMin: 1440 },
      pointer: { clientX: 124, clientY: 10 },
      startOfView: dayjs("2024-01-15T00:00:00.000Z"),
    });

    expect(dateCalcs.getDateByXY).toHaveBeenCalledWith(
      100,
      0,
      dayjs("2024-01-15T00:00:00.000Z"),
    );
    expect(result?.startDate).toBe("2024-01-17");
    expect(result?.endDate).toBe("2024-01-18");
  });
});

describe("computeDragHasMoved", () => {
  it("treats equivalent timed instants as unmoved", () => {
    const dateCalcs = {
      getDateStrByXY: mock(() => "2024-01-15T04:00:00.000-06:00"),
    } as unknown as DateCalcs;

    expect(
      computeDragHasMoved({
        dateCalcs,
        draft: createDraft(),
        pointer: { clientX: 120, clientY: 300 },
        startOfView: dayjs("2024-01-15T00:00:00.000Z"),
      }),
    ).toBe(false);
  });
});
