import { confirmedReservationScanRange } from "@backend/booking/booking-reservation.repository";
import { describe, expect, it } from "bun:test";

describe("confirmedReservationScanRange", () => {
  it("covers the local days of an intra-day window", () => {
    const range = confirmedReservationScanRange(
      { bufferMinutes: 15, durationMinutes: 30, timeZone: "UTC" },
      new Date("2026-09-07T09:30:00.000Z"),
      new Date("2026-09-07T11:00:00.000Z"),
    );

    expect(range.from.toISOString()).toBe("2026-09-07T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-09-08T00:00:00.000Z");
  });

  it("extends past local midnight when duration plus buffer outruns the day bound", () => {
    const range = confirmedReservationScanRange(
      { bufferMinutes: 30, durationMinutes: 30, timeZone: "UTC" },
      new Date("2026-09-07T23:00:00.000Z"),
      new Date("2026-09-07T23:30:00.000Z"),
    );

    expect(range.from.toISOString()).toBe("2026-09-07T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-09-08T00:30:00.000Z");
  });

  it("treats a null buffer as zero extra width", () => {
    const range = confirmedReservationScanRange(
      { bufferMinutes: null, durationMinutes: 30, timeZone: "UTC" },
      new Date("2026-09-07T23:00:00.000Z"),
      new Date("2026-09-07T23:30:00.000Z"),
    );

    expect(range.to.toISOString()).toBe("2026-09-08T00:00:00.000Z");
  });
});
