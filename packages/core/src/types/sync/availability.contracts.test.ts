import { faker } from "@faker-js/faker";
import { BusyAvailabilityRequestSchema } from "@core/types/sync/availability.contracts";
import { describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

const baseRequest = () => ({
  calendarIds: [objectId()],
  start: "2026-07-14T00:00:00.000Z",
  end: "2026-07-15T00:00:00.000Z",
  maxAgeMs: 300_000,
  purpose: "booking_confirmation" as const,
});

describe("BusyAvailabilityRequestSchema", () => {
  it("accepts a request without excludeEventIds", () => {
    expect(BusyAvailabilityRequestSchema.safeParse(baseRequest()).success).toBe(
      true,
    );
  });

  it("accepts an optional array of event ids", () => {
    const request = { ...baseRequest(), excludeEventIds: [objectId()] };
    expect(BusyAvailabilityRequestSchema.safeParse(request).success).toBe(true);
  });

  it("accepts an empty excludeEventIds array", () => {
    const request = { ...baseRequest(), excludeEventIds: [] };
    expect(BusyAvailabilityRequestSchema.safeParse(request).success).toBe(true);
  });

  it("rejects extra keys", () => {
    const request = { ...baseRequest(), eventTitles: ["secret"] };
    expect(BusyAvailabilityRequestSchema.safeParse(request).success).toBe(
      false,
    );
  });

  it("rejects extra keys alongside excludeEventIds", () => {
    const request = {
      ...baseRequest(),
      excludeEventIds: [objectId()],
      calendarEventId: objectId(),
    };
    expect(BusyAvailabilityRequestSchema.safeParse(request).success).toBe(
      false,
    );
  });
});
