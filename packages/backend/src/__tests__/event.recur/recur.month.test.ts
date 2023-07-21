import { RRule } from "rrule";
import {
  RRULE,
  RRULE_COUNT_MONTHS,
} from "../../../../core/src/constants/core.constants";
import { assembleRecurringEvents } from "../../event/services/event.service.util";

describe("Event Recurrence: Month", () => {
  it("uses expected # of instances", () => {
    const rEvents = assembleRecurringEvents({
      startDate: "2023-08-20",
      endDate: "2023-08-26",
      recurrence: [RRULE.MONTH],
    });
    expect(rEvents).toHaveLength(RRULE_COUNT_MONTHS);
  });

  it("maps RRULE string to object: month", () => {
    const rule = RRule.fromString(RRULE.MONTH);
    expect(rule.all()).toHaveLength(RRULE_COUNT_MONTHS);
  });
});
