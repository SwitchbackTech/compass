import { parseApplePollThrottleArgs } from "@scripts/commands/apple-poll-throttle";
import { describe, expect, it } from "bun:test";

describe("parseApplePollThrottleArgs", () => {
  it("defaults to a 5 second interval and 30 minute duration", () => {
    expect(parseApplePollThrottleArgs([])).toEqual({
      intervalMs: 5_000,
      durationMs: 30 * 60_000,
      calendarHref: undefined,
    });
  });

  it("accepts explicit interval, duration, and calendar href", () => {
    expect(
      parseApplePollThrottleArgs([
        "--interval-seconds",
        "10",
        "--duration-seconds",
        "120",
        "--calendar-href",
        "/calendars/home/abc/",
      ]),
    ).toEqual({
      intervalMs: 10_000,
      durationMs: 120_000,
      calendarHref: "/calendars/home/abc/",
    });
  });
});
