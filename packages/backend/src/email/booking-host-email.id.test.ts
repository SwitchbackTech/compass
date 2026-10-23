import {
  buildBookingHostEmailLedgerId,
  parseBookingHostEmailLedgerId,
} from "@backend/email/booking-host-email.id";
import { describe, expect, it } from "bun:test";

describe("booking-host-email.id", () => {
  it("builds and parses a stable ledger id", () => {
    const at = new Date("2026-10-23T18:00:00.000Z");
    const id = buildBookingHostEmailLedgerId({
      reservationId: "507f1f77bcf86cd799439011",
      lastGuestActionAt: at,
      kind: "booked",
    });
    expect(id).toBe(
      `booking-host:507f1f77bcf86cd799439011:${at.getTime()}:booked`,
    );
    expect(parseBookingHostEmailLedgerId(id)).toEqual({
      reservationId: "507f1f77bcf86cd799439011",
      kind: "booked",
    });
  });
});
