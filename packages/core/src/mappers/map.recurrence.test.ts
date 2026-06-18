import { rewriteRecurrenceFreq } from "@core/mappers/map.recurrence";
import { Categories_Event } from "@core/types/event.types";

describe("rewriteRecurrenceFreq", () => {
  it("rewrites FREQ to WEEKLY for the week list", () => {
    const result = rewriteRecurrenceFreq(
      { rule: ["RRULE:FREQ=DAILY;COUNT=10;INTERVAL=1"] },
      Categories_Event.SOMEDAY_WEEK,
    );

    expect(result?.rule).toEqual(["RRULE:FREQ=WEEKLY;COUNT=10;INTERVAL=1"]);
  });

  it("rewrites FREQ to MONTHLY for the month list", () => {
    const result = rewriteRecurrenceFreq(
      { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] },
      Categories_Event.SOMEDAY_MONTH,
    );

    expect(result?.rule).toEqual(["RRULE:FREQ=MONTHLY;COUNT=10"]);
  });

  it("rewrites FREQ with no trailing tokens", () => {
    const result = rewriteRecurrenceFreq(
      { rule: ["RRULE:FREQ=DAILY"] },
      Categories_Event.SOMEDAY_WEEK,
    );

    expect(result?.rule).toEqual(["RRULE:FREQ=WEEKLY"]);
  });

  it("leaves non-RRULE lines untouched", () => {
    const result = rewriteRecurrenceFreq(
      { rule: ["RRULE:FREQ=DAILY", "EXDATE:20240101T000000Z"] },
      Categories_Event.SOMEDAY_WEEK,
    );

    expect(result?.rule).toEqual([
      "RRULE:FREQ=WEEKLY",
      "EXDATE:20240101T000000Z",
    ]);
  });

  it("preserves the recurrence eventId", () => {
    const result = rewriteRecurrenceFreq(
      { rule: ["RRULE:FREQ=DAILY"], eventId: "abc" },
      Categories_Event.SOMEDAY_WEEK,
    );

    expect(result?.eventId).toBe("abc");
  });

  it("returns the recurrence unchanged when there is no rule", () => {
    expect(
      rewriteRecurrenceFreq(undefined, Categories_Event.SOMEDAY_WEEK),
    ).toBeUndefined();
    expect(
      rewriteRecurrenceFreq({ rule: null }, Categories_Event.SOMEDAY_WEEK),
    ).toEqual({ rule: null });
  });
});
