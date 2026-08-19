import {
  googleInstanceEventId,
  parseGoogleInstanceEventId,
} from "@sync/providers/google/google-instance-id";

describe("googleInstanceEventId", () => {
  it("mints a timed instance id in UTC RFC5545 form", () => {
    expect(
      googleInstanceEventId("series-1", "2025-01-15T09:00:00-05:00", "timed"),
    ).toBe("series-1_20250115T140000Z");
  });

  it("mints an all-day instance id as a compact date", () => {
    expect(
      googleInstanceEventId("series-1", "2026-08-08T00:00:00.000Z", "allDay"),
    ).toBe("series-1_20260808");
  });
});

describe("parseGoogleInstanceEventId", () => {
  it("parses a timed instance id back to the series and UTC recurrenceId", () => {
    expect(
      parseGoogleInstanceEventId("0cu25g99pfkhlfarupevcjc297_20211123T170000Z"),
    ).toEqual({
      seriesProviderId: "0cu25g99pfkhlfarupevcjc297",
      recurrenceId: "2021-11-23T17:00:00.000Z",
      scheduleKind: "timed",
    });
  });

  it("parses an all-day instance id as UTC midnight", () => {
    expect(parseGoogleInstanceEventId("series-1_20260808")).toEqual({
      seriesProviderId: "series-1",
      recurrenceId: "2026-08-08T00:00:00.000Z",
      scheduleKind: "allDay",
    });
  });

  it("keeps underscores that belong to the series id", () => {
    expect(parseGoogleInstanceEventId("foo_bar_20211123T170000Z")).toEqual({
      seriesProviderId: "foo_bar",
      recurrenceId: "2021-11-23T17:00:00.000Z",
      scheduleKind: "timed",
    });
  });

  it("returns null for a plain event id with no instance suffix", () => {
    expect(parseGoogleInstanceEventId("0cu25g99pfkhlfarupevcjc297")).toBeNull();
  });

  it("round-trips mint then parse for timed and all-day", () => {
    const timedId = googleInstanceEventId(
      "m",
      "2026-07-21T09:00:00-06:00",
      "timed",
    );
    expect(parseGoogleInstanceEventId(timedId)).toEqual({
      seriesProviderId: "m",
      recurrenceId: "2026-07-21T15:00:00.000Z",
      scheduleKind: "timed",
    });

    const allDayId = googleInstanceEventId(
      "m",
      "2026-07-21T00:00:00.000Z",
      "allDay",
    );
    expect(parseGoogleInstanceEventId(allDayId)).toEqual({
      seriesProviderId: "m",
      recurrenceId: "2026-07-21T00:00:00.000Z",
      scheduleKind: "allDay",
    });
  });
});
