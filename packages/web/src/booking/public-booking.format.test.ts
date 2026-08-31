import { getPublicBookingSlotWindow } from "@web/booking/public-booking.format";
import { describe, expect, it } from "bun:test";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("getPublicBookingSlotWindow", () => {
  it("clamps the default 14-day window to a shorter host horizon", () => {
    const window = getPublicBookingSlotWindow("UTC", 7);
    const spanMs = Date.parse(window.end) - Date.parse(window.start);

    expect(spanMs).toBeGreaterThan(0);
    expect(spanMs).toBeLessThanOrEqual(7 * DAY_MS + 60_000);
  });

  it("keeps the default 14-day window when the host horizon is longer", () => {
    const window = getPublicBookingSlotWindow("UTC", 60);
    const spanMs = Date.parse(window.end) - Date.parse(window.start);

    expect(spanMs).toBeGreaterThan(14 * DAY_MS - 60_000);
    expect(spanMs).toBeLessThan(15 * DAY_MS);
  });

  it("does not let end-of-day padding extend past a 14-day horizon", () => {
    const window = getPublicBookingSlotWindow("UTC", 14);
    const spanMs = Date.parse(window.end) - Date.parse(window.start);

    expect(spanMs).toBeLessThanOrEqual(14 * DAY_MS + 60_000);
  });
});
