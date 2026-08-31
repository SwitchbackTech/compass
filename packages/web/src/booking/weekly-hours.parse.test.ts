import {
  formatHoursRanges,
  parseHoursRanges,
} from "@web/booking/weekly-hours.parse";
import { describe, expect, it } from "bun:test";

const ok = (input: string) => {
  const result = parseHoursRanges(input);
  if (!result.ok)
    throw new Error(`expected "${input}" to parse: ${result.error}`);
  return result.ranges;
};

describe("parseHoursRanges", () => {
  it("reads a bare hour range as the working day", () => {
    // The headline case: parseUserTime's meridiem inheritance would make this
    // 9 AM to 5 AM, which the contract rejects outright.
    expect(ok("9-5")).toEqual([{ start: "09:00", end: "17:00" }]);
  });

  it.each([
    ["9:30-5:30p", [{ start: "09:30", end: "17:30" }]],
    ["0930-1700", [{ start: "09:30", end: "17:00" }]],
    ["9:00-17:00", [{ start: "09:00", end: "17:00" }]],
    ["8a-12p", [{ start: "08:00", end: "12:00" }]],
    ["9 to 5", [{ start: "09:00", end: "17:00" }]],
    ["9–5", [{ start: "09:00", end: "17:00" }]],
    ["  9 - 5  ", [{ start: "09:00", end: "17:00" }]],
  ])("parses %p", (input, expected) => {
    expect(ok(input as string)).toEqual(expected as never);
  });

  it("keeps an explicit AM end as AM", () => {
    // Explicitly stated, so the PM correction must stand down. 5am is after
    // 1am, so this is a legitimate overnight-ish early range.
    expect(ok("1-5am")).toEqual([{ start: "01:00", end: "05:00" }]);
  });

  it("does not push an end that is already after the start", () => {
    expect(ok("9-11")).toEqual([{ start: "09:00", end: "11:00" }]);
  });

  it("reads a comma-separated list as several intervals", () => {
    // The contract allows this; the old editor silently dropped all but the
    // first interval on the next save.
    expect(ok("9-12, 1-5")).toEqual([
      { start: "09:00", end: "12:00" },
      { start: "13:00", end: "17:00" },
    ]);
  });

  it("treats blank as unavailable rather than an error", () => {
    expect(ok("")).toEqual([]);
    expect(ok("   ")).toEqual([]);
  });

  it.each([
    "nonsense",
    "9",
    "9-",
    "-5",
    "9-5-7",
    "25-30",
  ])("rejects %p", (input) => {
    expect(parseHoursRanges(input).ok).toBe(false);
  });

  it("rejects an end at or before the start", () => {
    // 5pm to 9am cannot be corrected into anything sensible.
    expect(parseHoursRanges("5pm-9am").ok).toBe(false);
    expect(parseHoursRanges("9am-9am").ok).toBe(false);
  });

  it("rejects overlapping intervals with a distinct message", () => {
    const result = parseHoursRanges("9-12, 11-2");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(
      "Those hours overlap each other.",
    );
  });
});

describe("formatHoursRanges", () => {
  it("round-trips through the parser", () => {
    const text = formatHoursRanges(ok("9-12, 1-5"));
    expect(text).toBe("9am-12pm, 1pm-5pm");
    expect(ok(text)).toEqual(ok("9-12, 1-5"));
  });

  it("renders an empty day as an empty string", () => {
    expect(formatHoursRanges([])).toBe("");
  });

  it("keeps minutes when they are not on the hour", () => {
    expect(formatHoursRanges(ok("9:30-5:15p"))).toBe("9:30am-5:15pm");
  });
});
