import {
  validateBookingCancelSearch,
  validatePublicBookingSearch,
} from "@web/booking/public-booking-search";
import { describe, expect, it } from "bun:test";

describe("validatePublicBookingSearch", () => {
  it("keeps well-formed selection params", () => {
    expect(
      validatePublicBookingSearch({
        month: "2026-09",
        date: "2026-09-07",
        slot: "2026-09-07T10:00:00.000Z",
        tz: "Europe/London",
      }),
    ).toEqual({
      month: "2026-09",
      date: "2026-09-07",
      slot: "2026-09-07T10:00:00.000Z",
      tz: "Europe/London",
    });
  });

  it("drops garbage to undefined without throwing", () => {
    expect(
      validatePublicBookingSearch({
        month: "next-month",
        date: 42,
        slot: "not-a-date",
        tz: "Mars/Olympus_Mons",
      }),
    ).toEqual({
      month: undefined,
      date: undefined,
      slot: undefined,
      tz: undefined,
    });
  });

  it("handles an empty search", () => {
    expect(validatePublicBookingSearch({})).toEqual({
      month: undefined,
      date: undefined,
      slot: undefined,
      tz: undefined,
    });
  });
});

describe("validateBookingCancelSearch", () => {
  it("keeps a non-empty token", () => {
    expect(validateBookingCancelSearch({ token: "abc123" })).toEqual({
      token: "abc123",
    });
  });

  it("drops empty and non-string tokens", () => {
    expect(validateBookingCancelSearch({ token: "" })).toEqual({
      token: undefined,
    });
    expect(validateBookingCancelSearch({ token: 7 })).toEqual({
      token: undefined,
    });
    expect(validateBookingCancelSearch({})).toEqual({ token: undefined });
  });
});
