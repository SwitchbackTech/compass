import { datetime, RRule } from "rrule";
import { getRecurrenceText } from "../util/event.recur.util";

describe("Event Recurrence: Standard", () => {
  it("supports daily recurrence", () => {
    const rule = new RRule({
      freq: RRule.WEEKLY,
      interval: 5,
      byweekday: [RRule.MO, RRule.FR],
      dtstart: datetime(2012, 2, 1, 10, 30),
      until: datetime(2012, 12, 31),
    });

    const result = getRecurrenceText(rule);

    expect(result).toEqual("RFD");
  });
  test.todo("supports weekly recurrence");
  test.todo("supports monthly recurrence");
  test.todo("supports monthly on date recurrence");
  test.todo("supports monthly on week # recurrence");
  test.todo("supports annual recurrence");
  test.todo("supports recurrence");
});

describe("Event Recurrence: Custom", () => {
  it.todo("supports weekly on MWF");
});
