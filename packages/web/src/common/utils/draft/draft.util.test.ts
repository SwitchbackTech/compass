import { Categories_Event } from "@core/types/event.types";
import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("@web/auth/compass/session/session.util", () => ({
  getUserId: mock().mockResolvedValue("mock-user-id"),
}));

const { assembleDefaultEvent } =
  require("../event/event.util") as typeof import("../event/event.util");

describe("assembleDefaultEvent", () => {
  it("should include dates for someday event when provided", async () => {
    const startDate = "2024-01-01";
    const endDate = "2024-01-07";
    const eventWithDates = await assembleDefaultEvent(
      Categories_Event.SOMEDAY_WEEK,
      startDate,
      endDate,
    );

    expect(eventWithDates).toHaveProperty("startDate", startDate);
    expect(eventWithDates).toHaveProperty("endDate", endDate);
  });
  it("dates should be empty for someday event when not provided", async () => {
    const eventWithoutDates = await assembleDefaultEvent(
      Categories_Event.SOMEDAY_WEEK,
    );

    expect(eventWithoutDates).toHaveProperty("startDate", undefined);
    expect(eventWithoutDates).toHaveProperty("endDate", undefined);
  });
});

afterAll(() => {
  mock.restore();
});
