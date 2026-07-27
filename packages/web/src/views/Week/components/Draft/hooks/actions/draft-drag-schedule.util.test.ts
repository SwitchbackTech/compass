import dayjs from "@core/util/date/dayjs";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { CROSS_ROW_TIMED_DURATION_MIN } from "@web/grid/interaction/math/cross-row.drag";
import {
  resolveDraftDragRow,
  resolveDraftDragSchedule,
} from "./draft-drag-schedule.util";
import { describe, expect, it } from "bun:test";

const startOfView = dayjs("2026-05-10T00:00:00.000");

const allDaySchedule = {
  kind: "allDay" as const,
  start: new Date("2026-05-13T00:00:00.000"),
  end: new Date("2026-05-14T00:00:00.000"),
};

const timedSchedule = {
  kind: "timed" as const,
  start: new Date("2026-05-13T09:00:00.000"),
  end: new Date("2026-05-13T10:00:00.000"),
  timeZone: "UTC",
};

const createGetElementById = ({
  allDayTop = 20,
  allDayBottom = 60,
  includeMainGrid = true,
}: {
  allDayTop?: number;
  allDayBottom?: number;
  includeMainGrid?: boolean;
} = {}) => {
  const allDayRow = {
    getBoundingClientRect: () =>
      ({
        top: allDayTop,
        bottom: allDayBottom,
        left: 100,
        right: 800,
        height: allDayBottom - allDayTop,
        width: 700,
        x: 100,
        y: allDayTop,
        toJSON: () => ({}),
      }) as DOMRect,
  } as HTMLElement;

  const mainGrid = { id: ID_GRID_MAIN } as HTMLElement;

  return (id: string): HTMLElement | null => {
    if (id === ID_GRID_ALLDAY_ROW) return allDayRow;
    if (id === ID_GRID_MAIN) return includeMainGrid ? mainGrid : null;
    return null;
  };
};

describe("resolveDraftDragRow", () => {
  it("returns allDay when the pointer is inside the all-day row", () => {
    expect(resolveDraftDragRow(40, "allDay", createGetElementById())).toBe(
      "allDay",
    );
  });

  it("returns timed when the pointer is outside the all-day row", () => {
    expect(resolveDraftDragRow(200, "allDay", createGetElementById())).toBe(
      "timed",
    );
  });

  it("falls back to the source row when either grid row is missing", () => {
    expect(
      resolveDraftDragRow(
        200,
        "allDay",
        createGetElementById({ includeMainGrid: false }),
      ),
    ).toBe("allDay");
  });
});

describe("resolveDraftDragSchedule", () => {
  const getDateByXY = (x: number, y: number) => {
    // Simplified grid: day column from x, minutes from y (15-min steps).
    const dayOffset = Math.max(0, Math.floor((x - 100) / 100));
    const minutes = Math.max(0, Math.floor(y / 2 / 15) * 15);
    return startOfView.add(dayOffset, "day").add(minutes, "minutes");
  };

  it("converts an all-day draft to a timed block over the timed grid", () => {
    const result = resolveDraftDragSchedule({
      clientX: 450,
      clientY: 200,
      dragOffset: { x: 10, y: 5 },
      dragStatus: { durationMin: 24 * 60, hasMoved: true },
      getDateByXY,
      getElementById: createGetElementById(),
      schedule: allDaySchedule,
      startOfView,
    });

    expect(result.row).toBe("timed");
    expect(result.durationMin).toBe(CROSS_ROW_TIMED_DURATION_MIN);
    expect(result.schedule.kind).toBe("timed");
    expect(dayjs(result.schedule.start).format()).toBe(
      getDateByXY(450, 200).format(),
    );
    expect(dayjs(result.schedule.end).format()).toBe(
      getDateByXY(450, 200)
        .add(CROSS_ROW_TIMED_DURATION_MIN, "minutes")
        .format(),
    );
  });

  it("keeps an all-day draft all-day while the pointer stays in the all-day row", () => {
    const result = resolveDraftDragSchedule({
      clientX: 450,
      clientY: 40,
      dragOffset: { x: 10, y: 5 },
      dragStatus: { durationMin: 24 * 60 },
      getDateByXY,
      getElementById: createGetElementById(),
      schedule: allDaySchedule,
      startOfView,
    });

    expect(result.row).toBe("allDay");
    expect(result.schedule.kind).toBe("allDay");
    expect(dayjs(result.schedule.start).format("YYYY-MM-DD")).toBe(
      getDateByXY(440, 0).startOf("day").format("YYYY-MM-DD"),
    );
    expect(dayjs(result.schedule.end).format("YYYY-MM-DD")).toBe(
      getDateByXY(440, 0).startOf("day").add(1, "day").format("YYYY-MM-DD"),
    );
  });

  it("converts a timed draft to a one-day all-day event over the all-day row", () => {
    const result = resolveDraftDragSchedule({
      clientX: 450,
      clientY: 40,
      dragOffset: { x: 0, y: 20 },
      dragStatus: { durationMin: 60, hasMoved: true },
      getDateByXY,
      getElementById: createGetElementById(),
      schedule: timedSchedule,
      startOfView,
    });

    expect(result.row).toBe("allDay");
    expect(result.schedule.kind).toBe("allDay");
    expect(result.durationMin).toBe(24 * 60);
    expect(dayjs(result.schedule.start).format("YYYY-MM-DD")).toBe(
      getDateByXY(450, 0).startOf("day").format("YYYY-MM-DD"),
    );
    expect(dayjs(result.schedule.end).format("YYYY-MM-DD")).toBe(
      getDateByXY(450, 0).startOf("day").add(1, "day").format("YYYY-MM-DD"),
    );
  });

  it("preserves timed duration when dragging within the timed grid", () => {
    const result = resolveDraftDragSchedule({
      clientX: 450,
      clientY: 200,
      dragOffset: { x: 0, y: 20 },
      dragStatus: { durationMin: 90, hasMoved: true },
      getDateByXY,
      getElementById: createGetElementById(),
      schedule: {
        ...timedSchedule,
        end: new Date("2026-05-13T10:30:00.000"),
      },
      startOfView,
    });

    expect(result.row).toBe("timed");
    expect(result.durationMin).toBe(90);
    expect(result.schedule.kind).toBe("timed");
    expect(
      dayjs(result.schedule.end).diff(result.schedule.start, "minutes"),
    ).toBe(90);
  });

  it("ignores a stale all-day dragStatus duration after converting to timed", () => {
    // Simulates the frame after all-day → timed: schedule is already timed
    // (60m) but dragStatus still holds the all-day day-length.
    const result = resolveDraftDragSchedule({
      clientX: 450,
      clientY: 200,
      dragOffset: { x: 0, y: 0 },
      dragStatus: { durationMin: 24 * 60, hasMoved: true },
      getDateByXY,
      getElementById: createGetElementById(),
      schedule: {
        kind: "timed",
        start: new Date("2026-05-13T09:00:00.000"),
        end: new Date("2026-05-13T10:00:00.000"),
        timeZone: "UTC",
      },
      startOfView,
    });

    expect(result.row).toBe("timed");
    expect(result.durationMin).toBe(CROSS_ROW_TIMED_DURATION_MIN);
    expect(
      dayjs(result.schedule.end).diff(result.schedule.start, "minutes"),
    ).toBe(CROSS_ROW_TIMED_DURATION_MIN);
  });
});
