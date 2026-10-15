import {
  civilDayLengthMinutes,
  civilHourLineInstants,
  civilHourSlotCount,
  formatInstantInTimeZone,
  minutesFromCivilMidnight,
} from "./civil-day";
import { describe, expect, it } from "bun:test";

const denver = "America/Denver";
const newYork = "America/New_York";

describe("civilDayLengthMinutes", () => {
  it("counts 1500 minutes on US fall-back 2026-11-01 in Denver", () => {
    expect(civilDayLengthMinutes("2026-11-01", denver)).toBe(1500);
    expect(civilHourSlotCount("2026-11-01", denver)).toBe(25);
  });

  it("counts 1380 minutes on US spring-forward 2027-03-14 in Denver", () => {
    expect(civilDayLengthMinutes("2027-03-14", denver)).toBe(1380);
    expect(civilHourSlotCount("2027-03-14", denver)).toBe(23);
  });

  it("matches New York fall-back and spring-forward boundaries", () => {
    expect(civilDayLengthMinutes("2026-11-01", newYork)).toBe(1500);
    expect(civilDayLengthMinutes("2027-03-14", newYork)).toBe(1380);
  });

  it("counts 1440 minutes on a non-transition day", () => {
    expect(civilDayLengthMinutes("2026-08-20", denver)).toBe(1440);
  });
});

describe("minutesFromCivilMidnight", () => {
  it("places 9 AM on the expected minute index regardless of offset suffix", () => {
    expect(minutesFromCivilMidnight("2026-11-05T09:00:00-07:00", denver)).toBe(
      540,
    );
    expect(minutesFromCivilMidnight("2026-11-05T16:00:00.000Z", denver)).toBe(
      540,
    );
  });

  it("separates the two 1:30 AM instants on fall-back day", () => {
    expect(minutesFromCivilMidnight("2026-11-01T01:30:00-06:00", denver)).toBe(
      90,
    );
    expect(minutesFromCivilMidnight("2026-11-01T01:30:00-07:00", denver)).toBe(
      150,
    );
  });
});

describe("civilHourLineInstants", () => {
  it("walks 1 AM through 11 PM on a non-transition day", () => {
    const lines = civilHourLineInstants("2026-08-20", denver);
    expect(lines).toHaveLength(23);
    expect(lines[0]?.format("YYYY-MM-DD HH:mm")).toBe("2026-08-20 01:00");
    expect(lines.at(-1)?.format("YYYY-MM-DD HH:mm")).toBe("2026-08-20 23:00");
  });

  it("adds the next midnight when includeMidnight is true", () => {
    const lines = civilHourLineInstants("2026-08-20", denver, true);
    expect(lines).toHaveLength(24);
    expect(lines.at(-1)?.format("YYYY-MM-DD HH:mm")).toBe("2026-08-21 00:00");
  });

  it("follows DST slot counts", () => {
    expect(civilHourLineInstants("2026-11-01", denver, true)).toHaveLength(25);
    expect(civilHourLineInstants("2027-03-14", denver, true)).toHaveLength(23);
  });
});

describe("formatInstantInTimeZone", () => {
  it("re-anchors to the zone offset for the civil date", () => {
    const formatted = formatInstantInTimeZone(
      "2026-11-05T16:00:00.000Z",
      denver,
    );
    expect(formatted).toBe("2026-11-05T09:00:00-07:00");
  });
});
