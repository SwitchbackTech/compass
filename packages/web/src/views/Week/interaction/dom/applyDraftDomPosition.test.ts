import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { applyDraftDomPosition } from "./applyDraftDomPosition";
import { describe, expect, it } from "bun:test";

const createDraft = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  _id: "event-1",
  title: "Seed event",
  startDate: "2024-01-15T10:00:00.000Z",
  endDate: "2024-01-15T11:00:00.000Z",
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

const measurements = {
  colWidths: [100, 100, 100, 100, 100, 100, 100],
  hourHeight: 80,
} as Measurements_Grid;

describe("applyDraftDomPosition", () => {
  it("uses transform for draft movement instead of rewriting top and left", () => {
    const element = document.createElement("div");
    const baseDraft = createDraft();
    const liveDraft = createDraft({
      startDate: "2024-01-16T11:00:00.000Z",
      endDate: "2024-01-16T12:00:00.000Z",
    });

    applyDraftDomPosition({
      baseDraft,
      draft: liveDraft,
      element,
      endOfView: dayjs("2024-01-21T23:59:59.999Z"),
      measurements,
      startOfView: dayjs("2024-01-15T00:00:00.000Z"),
    });

    expect(element.style.transform).toBe("translate3d(100px, 80px, 0)");
    expect(element.style.top).toBe("");
    expect(element.style.left).toBe("");
  });

  it("updates size when resize changes the draft height", () => {
    const element = document.createElement("div");
    const baseDraft = createDraft();
    const liveDraft = createDraft({
      endDate: "2024-01-15T12:00:00.000Z",
    });

    applyDraftDomPosition({
      baseDraft,
      draft: liveDraft,
      element,
      endOfView: dayjs("2024-01-21T23:59:59.999Z"),
      measurements,
      startOfView: dayjs("2024-01-15T00:00:00.000Z"),
    });

    expect(Number.parseFloat(element.style.height)).toBeCloseTo(157);
  });
});
