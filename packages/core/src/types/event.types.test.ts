import { Origin, Priorities } from "@core/constants/core.constants";
import { CoreEventSchema } from "./event.types";
import { describe, expect, it } from "bun:test";

describe("CoreEventSchema", () => {
  it("preserves someday order values", () => {
    const parsedEvent = CoreEventSchema.parse({
      _id: "507f1f77bcf86cd799439011",
      startDate: "2026-04-06T15:00:00.000Z",
      endDate: "2026-04-06T16:00:00.000Z",
      isSomeday: true,
      order: 3,
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      user: "user-1",
    });

    expect(parsedEvent.order).toBe(3);
  });
});
