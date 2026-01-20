import {
  convertRruleWithUntilToDate,
  formatAs,
  formatAsIso8601,
  isDateRangeOverlapping,
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

describe("isDateRangeOverlapping", () => {
  describe("with day granularity", () => {
    it("returns true when range A is completely within range B", () => {
      expect(
        isDateRangeOverlapping(
          "2024-01-05",
          "2024-01-07",
          "2024-01-01",
          "2024-01-10",
          "day",
        ),
      ).toBe(true);
    });

    it("returns true when range A starts before but ends within range B", () => {
      expect(
        isDateRangeOverlapping(
          "2024-01-01",
          "2024-01-05",
          "2024-01-03",
          "2024-01-10",
          "day",
        ),
      ).toBe(true);
    });

    it("returns true when range A spans entirely over range B", () => {
      expect(
        isDateRangeOverlapping(
          "2024-01-01",
          "2024-01-10",
          "2024-01-03",
          "2024-01-05",
          "day",
        ),
      ).toBe(true);
    });

    it("returns true when range A starts within but ends after range B", () => {
      expect(
        isDateRangeOverlapping(
          "2024-01-05",
          "2024-01-15",
          "2024-01-01",
          "2024-01-10",
          "day",
        ),
      ).toBe(true);
    });

    it("returns false when ranges do not overlap", () => {
      expect(
        isDateRangeOverlapping(
          "2024-01-01",
          "2024-01-02",
          "2024-01-05",
          "2024-01-10",
          "day",
        ),
      ).toBe(false);
    });

    it("returns true when ranges share a boundary day", () => {
      expect(
        isDateRangeOverlapping(
          "2024-01-01",
          "2024-01-05",
          "2024-01-05",
          "2024-01-10",
          "day",
        ),
      ).toBe(true);
    });

    it("works with ISO string dates", () => {
      expect(
        isDateRangeOverlapping(
          "2024-01-05T10:00:00.000Z",
          "2024-01-05T14:00:00.000Z",
          "2024-01-05T00:00:00.000Z",
          "2024-01-05T23:59:59.999Z",
          "day",
        ),
      ).toBe(true);
    });
  });

  describe("without granularity (exact time)", () => {
    it("returns true when ranges overlap in time", () => {
      expect(
        isDateRangeOverlapping(
          "2024-01-01T10:00:00Z",
          "2024-01-01T14:00:00Z",
          "2024-01-01T12:00:00Z",
          "2024-01-01T16:00:00Z",
          null,
        ),
      ).toBe(true);
    });

    it("returns false when ranges do not overlap in time", () => {
      expect(
        isDateRangeOverlapping(
          "2024-01-01T10:00:00Z",
          "2024-01-01T11:00:00Z",
          "2024-01-01T12:00:00Z",
          "2024-01-01T14:00:00Z",
          null,
        ),
      ).toBe(false);
    });

    it("returns true when ranges share an exact boundary", () => {
      expect(
        isDateRangeOverlapping(
          "2024-01-01T10:00:00Z",
          "2024-01-01T12:00:00Z",
          "2024-01-01T12:00:00Z",
          "2024-01-01T14:00:00Z",
          null,
        ),
      ).toBe(true);
    });
  });
});
