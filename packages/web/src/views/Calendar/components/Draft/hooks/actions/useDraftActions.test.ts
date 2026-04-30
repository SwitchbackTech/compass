import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getDragDurationMinutes } from "./drag-duration.util";
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
    widthMultiplier: 1,
    horizontalOrder: 1,
    dragOffset: { y: 0 },
    initialX: null,
    initialY: null,
  },
  ...overrides,
});

describe("getDragDurationMinutes", () => {
  it("uses the draft duration before drag status is ready", () => {
    expect(getDragDurationMinutes(createDraft(), null)).toBe(90);
  });

  it("uses the tracked duration once available", () => {
    expect(
      getDragDurationMinutes(createDraft(), {
        durationMin: 45,
      }),
    ).toBe(45);
  });
});
