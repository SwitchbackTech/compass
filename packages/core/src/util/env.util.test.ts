import { NodeEnv } from "@core/constants/core.constants";
import { isBookingEnabled, isDev } from "@core/util/env.util";
import { describe, expect, it } from "bun:test";

describe("isDev", () => {
  it("is true only for development", () => {
    expect(isDev(NodeEnv.Development)).toBe(true);
    expect(isDev(NodeEnv.Staging)).toBe(false);
    expect(isDev(NodeEnv.Production)).toBe(false);
    expect(isDev(NodeEnv.Test)).toBe(false);
  });
});

describe("isBookingEnabled", () => {
  it("is on in development, staging, and tests", () => {
    expect(isBookingEnabled(NodeEnv.Development)).toBe(true);
    expect(isBookingEnabled(NodeEnv.Staging)).toBe(true);
    expect(isBookingEnabled(NodeEnv.Test)).toBe(true);
  });

  it("is off in production", () => {
    expect(isBookingEnabled(NodeEnv.Production)).toBe(false);
    expect(isBookingEnabled("production")).toBe(false);
  });
});
