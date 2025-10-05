import { Frequency } from "rrule";
import {
  FREQUENCY_MAP,
  FREQUENCY_OPTIONS,
  WEEKDAYS,
} from "./recurrence.constants";

describe("RecurrenceSection utils", () => {
  it("FREQUENCY_MAP returns correct labels", () => {
    expect(FREQUENCY_MAP[Frequency.DAILY]).toBe("Day");
    expect(FREQUENCY_MAP[Frequency.WEEKLY]).toBe("Week");
    expect(FREQUENCY_MAP[Frequency.MONTHLY]).toBe("Month");
    expect(FREQUENCY_MAP[Frequency.YEARLY]).toBe("Year");
  });

  it("FREQUENCY_OPTIONS returns correct options", () => {
    const opts = FREQUENCY_OPTIONS("s");
    expect(opts).toEqual(
      expect.arrayContaining([
        { label: "Years", value: Frequency.YEARLY },
        { label: "Months", value: Frequency.MONTHLY },
        { label: "Weeks", value: Frequency.WEEKLY },
        { label: "Days", value: Frequency.DAILY },
      ]),
    );
  });

  it("WEEKDAYS contains all days", () => {
    expect(WEEKDAYS).toEqual([
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ]);
    expect(WEEKDAYS).toHaveLength(7);
  });
});
