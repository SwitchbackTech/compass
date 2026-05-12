import { Origin, Priorities } from "@core/constants/core.constants";
import { CompassCoreEventSchema } from "@core/types/event.types";
import { describe, expect, it } from "bun:test";

describe("CompassCoreEventSchema", () => {
  it("preserves someday event order", () => {
    const event = CompassCoreEventSchema.parse({
      _id: "507f1f77bcf86cd799439011",
      endDate: "2026-05-11",
      isSomeday: true,
      order: 7,
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      startDate: "2026-05-10",
      title: "Someday task",
      user: "user-1",
    });

    expect(event.order).toBe(7);
  });
});
