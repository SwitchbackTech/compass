import { isBookingPathname } from "./isBookingPathname";
import { describe, expect, it } from "bun:test";

describe("isBookingPathname", () => {
  it("matches public booking and cancel paths", () => {
    expect(isBookingPathname("/book/tylerdane")).toBe(true);
    expect(isBookingPathname("/book/cancel/abc123")).toBe(true);
  });

  it("does not match calendar routes", () => {
    expect(isBookingPathname("/week")).toBe(false);
    expect(isBookingPathname("/day/2026-01-01")).toBe(false);
  });
});
