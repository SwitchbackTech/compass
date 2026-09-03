import {
  publicCancelUrlForReservation,
  tokenFromGuestActionUrl,
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

describe("tokenFromGuestActionUrl", () => {
  it("reads token from an absolute cancel URL", () => {
    expect(
      tokenFromGuestActionUrl(
        "https://compasscalendar.com/book/cancel/000000000000000000000099?token=abc",
      ),
    ).toBe("abc");
  });

  it("reads token from a relative URL", () => {
    expect(tokenFromGuestActionUrl("/book/cancel/99?token=secret")).toBe(
      "secret",
    );
  });

  it("returns empty when token is missing or the URL is unusable", () => {
    expect(tokenFromGuestActionUrl("/book/cancel/99")).toBe("");
    expect(tokenFromGuestActionUrl("://bad")).toBe("");
  });
});

describe("publicCancelUrlForReservation", () => {
  it("builds an origin-absolute cancel URL", () => {
    expect(
      publicCancelUrlForReservation(
        "000000000000000000000099",
        "abc",
        "https://staging.compasscalendar.com",
      ),
    ).toBe(
      "https://staging.compasscalendar.com/book/cancel/000000000000000000000099?token=abc",
    );
  });
});
