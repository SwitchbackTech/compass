import {
  convertRruleWithUntilToDate,
  formatAs,
  formatAsIso8601,
} from "./date.util";

describe("convertRruleWithUntilToDate", () => {
  it("converts a recurrence rule with UNTIL value to an ISO date", () => {
    const rrule = "RRULE:FREQ=DAILY;UNTIL=20260108T005808Z";
    const isoDate = convertRruleWithUntilToDate(rrule);
    expect(isoDate).toEqual("2026-01-08T00:58:08.000Z");
  });
});
describe("formatAsIso8601", () => {
  it("parses RFC5545 iCalendar dates with Z suffix", () => {
    const utcDate = formatAsIso8601("20251207T155933Z");
    expect(utcDate).toEqual("2025-12-07T15:59:33.000Z");
  });

  it("parses RFC5545 iCalendar dates without Z suffix", () => {
    const localDate = formatAsIso8601("20251207T155933");
    expect(localDate).toEqual("2025-12-07T15:59:33.000Z");
  });

  it("parses RFC3339 dates with Z suffix", () => {
    const rfc3339 = formatAsIso8601("2025-12-07T15:59:33Z");
    expect(rfc3339).toEqual("2025-12-07T15:59:33.000Z");
  });

  it("parses RFC3339 dates with offset", () => {
    const rfc3339 = formatAsIso8601("2025-12-07T10:59:33-05:00");
    // dayjs will parse with offset and convert to UTC
    expect(rfc3339).toEqual("2025-12-07T15:59:33.000Z");
  });

  it("returns null for invalid dates", () => {
    const date = formatAsIso8601("invalid");
    expect(date).toBeNull();
  });
});

describe("formatAs", () => {
  it("converts ISO string to RFC5545 iCalendar format", () => {
    const rfc5545 = formatAs("RFC5545", "2025-12-07T15:59:33.000Z");
    expect(rfc5545).toEqual("20251207T155933Z");
  });

  it("converts ISO string to RFC3339 format", () => {
    const rfc3339 = formatAs("RFC3339", "2025-12-07T15:59:33.000Z");
    expect(rfc3339).toEqual("2025-12-07T15:59:33Z");
  });

  it("converts ISO string to RFC3339_OFFSET format", () => {
    // The output will be in +00:00 for UTC
    const rfc3339Offset = formatAs(
      "RFC3339_OFFSET",
      "2025-12-07T15:59:33.000Z",
    );
    expect(rfc3339Offset).toEqual("2025-12-07T15:59:33+00:00");
  });

  it("returns null for invalid dates", () => {
    const date = formatAs("RFC5545", "invalid");
    expect(date).toBeNull();
  });
});
