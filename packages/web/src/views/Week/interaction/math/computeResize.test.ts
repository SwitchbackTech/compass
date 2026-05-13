import { Origin, Priorities } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { computeResize } from "./computeResize";
import { describe, expect, it } from "bun:test";

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

describe("computeResize", () => {
  it("returns null when a timed resize snaps to the existing end time", () => {
    const draft = createDraft({
      endDate: "2024-01-15T11:30:00+00:00",
    });

    const result = computeResize({
      currTime: dayjs("2024-01-15T11:30:00.000Z"),
      dateBeingChanged: "endDate",
      draft,
      reduxDraft: draft,
    });

    expect(result).toBeNull();
  });

  it("updates the resized edge for valid timed movement", () => {
    const draft = createDraft();

    const result = computeResize({
      currTime: dayjs("2024-01-15T12:00:00.000Z"),
      dateBeingChanged: "endDate",
      draft,
      reduxDraft: draft,
    });

    expect(result).toEqual({
      dateChanged: "endDate",
      flipDraft: {
        endDate: "2024-01-15T11:30:00.000Z",
        hasFlipped: false,
        priority: Priorities.UNASSIGNED,
        startDate: "2024-01-15T10:00:00.000Z",
      },
      hasMoved: true,
      nextDateBeingChanged: "endDate",
      updatedTime: "2024-01-15T12:00:00+00:00",
    });
  });

  it("flips a timed end resize when the pointer crosses before the start", () => {
    const draft = createDraft();

    const result = computeResize({
      currTime: dayjs("2024-01-15T09:45:00.000Z"),
      dateBeingChanged: "endDate",
      draft,
      reduxDraft: draft,
    });

    expect(result?.nextDateBeingChanged).toBe("startDate");
    expect(result?.dateChanged).toBe("startDate");
    expect(result?.flipDraft).toEqual({
      endDate: "2024-01-15T10:00:00+00:00",
      hasFlipped: true,
      priority: Priorities.UNASSIGNED,
      startDate: "2024-01-15T09:45:00+00:00",
    });
    expect(result?.updatedTime).toBe("2024-01-15T09:45:00+00:00");
  });

  it("rejects timed resize movement into another day", () => {
    const draft = createDraft();

    const result = computeResize({
      currTime: dayjs("2024-01-16T12:00:00.000Z"),
      dateBeingChanged: "endDate",
      draft,
      reduxDraft: draft,
    });

    expect(result).toBeNull();
  });

  it("moves all-day resize end dates by full days", () => {
    const draft = createDraft({
      isAllDay: true,
      startDate: "2024-01-15",
      endDate: "2024-01-16",
    });

    const result = computeResize({
      currTime: dayjs("2024-01-17", YEAR_MONTH_DAY_FORMAT),
      dateBeingChanged: "endDate",
      draft,
      reduxDraft: draft,
    });

    expect(result?.updatedTime).toBe("2024-01-18");
    expect(result?.hasMoved).toBe(true);
  });
});
