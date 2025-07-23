import dayjs from "@core/util/date/dayjs";

describe("next", () => {
  it("adds returns the next time unit for a dayjs date", () => {
    const date = dayjs("2026-01-08T00:58:08.000Z");

    expect(date.next("millisecond").toISOString()).toEqual(
      "2026-01-08T00:58:08.001Z",
    );

    expect(date.next("second").toISOString()).toEqual(
      "2026-01-08T00:58:09.000Z",
    );

    expect(date.next("minute").toISOString()).toEqual(
      "2026-01-08T00:59:08.000Z",
    );

    expect(date.next("hour").toISOString()).toEqual("2026-01-08T01:58:08.000Z");

    expect(date.next("day").toISOString()).toEqual("2026-01-09T00:58:08.000Z");

    expect(date.next("week").toISOString()).toEqual("2026-01-15T00:58:08.000Z");

    expect(date.next("month").toISOString()).toEqual(
      "2026-02-08T00:58:08.000Z",
    );

    expect(date.next("year").toISOString()).toEqual("2027-01-08T00:58:08.000Z");
  });
});

describe("startOfNextWeek", () => {
  it("returns the start of the next week", () => {
    [
      "2026-07-26T00:00:00.000Z",
      "2026-07-27T00:00:00.000Z",
      "2026-07-28T00:00:00.000Z",
      "2026-07-29T00:00:00.000Z",
      "2026-07-30T00:00:00.000Z",
      "2026-07-31T00:00:00.000Z",
      "2026-08-01T00:00:00.000Z",
    ].forEach((day) =>
      expect(dayjs(day).startOfNextWeek().toISOString()).toEqual(
        "2026-08-02T00:00:00.000Z",
      ),
    );
  });
});

describe("startOfNextMonth", () => {
  it("returns the start of the next month", () => {
    for (let index = -5; index < 20; index++) {
      const month = dayjs.monthStrFromZeroIndex(index);
      const intMonth = dayjs.monthFromZeroIndex(index);
      const nextMonth = dayjs.monthStrFromZeroIndex(intMonth);
      const date = dayjs(
        `2026-${month}-08T00:58:08.000Z`,
        dayjs.DateFormat.RFC3339_OFFSET,
      );
      const isDecember = date.month() === 11;

      if (isDecember) break;

      expect(date.startOfNextMonth().toISOString()).toEqual(
        `2026-${nextMonth}-01T00:00:00.000Z`,
      );
    }
  });
});

describe("weekMonthRange", () => {
  it("returns a range representing the start of the week and month", () => {
    expect(dayjs("2026-07-25T00:00:00.000Z").weekMonthRange()).toEqual(
      expect.objectContaining({
        week: expect.objectContaining({
          startDate: dayjs("2026-07-19T00:00:00.000Z").toYearMonthDayString(),
          endDate: dayjs("2026-07-25T00:00:00.000Z").toYearMonthDayString(),
        }),
        month: expect.objectContaining({
          startDate: dayjs("2026-07-01T00:00:00.000Z").toYearMonthDayString(),
          endDate: dayjs("2026-07-31T00:00:00.000Z").toYearMonthDayString(),
        }),
      }),
    );
  });
});

describe("toRFC5545String", () => {
  it("converts dayjs date to RFC5545 iCalendar format", () => {
    const rfc5545 = dayjs("2025-12-07T15:59:33.000Z").toRFC5545String();

    expect(rfc5545).toEqual("20251207T155933Z");
  });
});

describe("toRFC3339String", () => {
  it("converts dayjs date to RFC3339 format", () => {
    const rfc3339 = dayjs("2025-12-07T15:59:33.000Z").toRFC3339String();

    expect(rfc3339).toEqual("2025-12-07T15:59:33Z");
  });
});

describe("toRFC3339OffsetString", () => {
  it("converts dayjs date to RFC3339_OFFSET format", () => {
    const rfc3339Offset = dayjs(
      "2025-12-07T15:59:33.000Z",
    ).toRFC3339OffsetString();

    expect(rfc3339Offset).toEqual(
      dayjs("2025-12-07T15:59:33+00:00").toRFC3339OffsetString(),
    );
  });
});

describe("toYearMonthDayString", () => {
  it("converts dayjs date to RFC3339 format", () => {
    const yearMonthDate = dayjs(
      "2025-12-07T15:59:33.000Z",
    ).toYearMonthDayString();

    expect(yearMonthDate).toEqual("2025-12-07");
  });
});

describe("monthFromZeroIndex", () => {
  it("it returns the zero indexed month from an index", () => {
    for (let index = -5; index < 20; index++) {
      const validIndex = index >= 0 && index <= 11;
      const month = dayjs.monthFromZeroIndex(index);

      if (validIndex) expect(month).toStrictEqual(index + 1);

      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
    }
  });
});

describe("monthStrFromZeroIndex", () => {
  it("it returns the zero indexed month string from an index", () => {
    for (let index = -5; index < 20; index++) {
      const validIndex = index >= 0 && index <= 11;
      const month = dayjs.monthStrFromZeroIndex(index);
      const intMonth = parseInt(month);

      if (validIndex) expect(intMonth).toStrictEqual(index + 1);

      expect(month).toHaveLength(2);
      expect(intMonth).toBeGreaterThanOrEqual(1);
      expect(intMonth).toBeLessThanOrEqual(12);
    }
  });
});

describe("rruleUntilToIsoString", () => {
  it("converts a recurrence rule with UNTIL value to an ISO date", () => {
    const rrule = "RRULE:FREQ=DAILY;UNTIL=20260108T005808Z";
    const isoDate = dayjs.rruleUntilToIsoString(rrule);

    expect(isoDate).toEqual(dayjs("2026-01-08T00:58:08.000Z").toISOString());
  });
});
