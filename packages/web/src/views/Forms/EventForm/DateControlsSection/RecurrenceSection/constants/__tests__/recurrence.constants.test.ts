import { Frequency } from "rrule";
import { FREQUENCY_OPTIONS } from "../recurrence.constants";

describe("recurrence.constants", () => {
  it("orders frequency options from day to year", () => {
    const options = FREQUENCY_OPTIONS();

    expect(options.map((option) => option.value)).toEqual([
      Frequency.DAILY,
      Frequency.WEEKLY,
      Frequency.MONTHLY,
      Frequency.YEARLY,
    ]);
  });
});
