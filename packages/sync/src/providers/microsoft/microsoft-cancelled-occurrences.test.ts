import { type EventSchedule } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import {
  type CancelledOccurrenceMasterContext,
  cancelledOccurrencesToExdateRules,
} from "@sync/providers/microsoft/microsoft-cancelled-occurrences";

const utcDailySchedule: EventSchedule = {
  kind: "timed",
  start: "2025-10-20T01:00:00.000Z",
  end: "2025-10-20T02:00:00.000Z",
  timeZone: "UTC",
};

const utcMaster = (
  overrides: Partial<CancelledOccurrenceMasterContext> = {},
): CancelledOccurrenceMasterContext => ({
  start: {
    dateTime: "2025-10-20T01:00:00.0000000",
    timeZone: "UTC",
  },
  originalStartTimeZone: "UTC",
  recurrence: {
    range: { recurrenceTimeZone: "UTC" },
  },
  ...overrides,
});

describe("cancelledOccurrencesToExdateRules", () => {
  it("maps OID.<id>.<yyyy-mm-dd> to EXDATE at master clock in recurrence zone (UTC)", () => {
    const rules = cancelledOccurrencesToExdateRules(
      ["OID.AAMkAGI2TG93AAA=.2025-10-21"],
      utcMaster(),
      utcDailySchedule,
    );
    expect(rules).toEqual(["EXDATE:20251021T010000Z"]);
  });

  it("maps each cancelled series date independently", () => {
    const entries = [
      "OID.series-one.2025-10-21",
      "OID.series-one.2025-10-23",
      "OID.series-one.2025-11-04",
    ];
    const rules = cancelledOccurrencesToExdateRules(
      entries,
      utcMaster(),
      utcDailySchedule,
    );
    expect(rules).toHaveLength(3);
    expect(rules).toContain("EXDATE:20251021T010000Z");
    expect(rules).toContain("EXDATE:20251023T010000Z");
    expect(rules).toContain("EXDATE:20251104T010000Z");
  });

  it("uses recurrenceTimeZone when start fields are UTC", () => {
    const rules = cancelledOccurrencesToExdateRules(
      ["OID.x.2025-10-21"],
      utcMaster({
        recurrence: { range: { recurrenceTimeZone: "UTC" } },
        originalStartTimeZone: "UTC",
      }),
      utcDailySchedule,
    );
    const instant = dayjs.utc("2025-10-21T01:00:00Z");
    expect(rules[0]).toBe(`EXDATE:${instant.format("YYYYMMDD[T]HHmmss[Z]")}`);
  });

  it("still accepts legacy ISO instant strings", () => {
    const rules = cancelledOccurrencesToExdateRules(
      ["2025-10-21T01:00:00.0000000Z"],
      utcMaster(),
      utcDailySchedule,
    );
    expect(rules).toEqual(["EXDATE:20251021T010000Z"]);
  });
});
