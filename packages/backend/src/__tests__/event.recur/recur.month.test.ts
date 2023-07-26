import { RRule } from "rrule";
import {
  RRULE,
  RRULE_COUNT_MONTHS,
} from "../../../../core/src/constants/core.constants";
import { assembleEventAndRecurrences } from "../../event/services/event.service.util";

describe("Event Recurrence: Month", () => {
  it("uses expected # of instances", () => {
    const rEvents = assembleEventAndRecurrences({
      startDate: "2023-08-20",
      endDate: "2023-08-26",
      recurrence: { rule: [RRULE.MONTH] },
    });
    expect(rEvents).toHaveLength(RRULE_COUNT_MONTHS + 1);
  });

  it("maps RRULE string to object: month", () => {
    const rule = RRule.fromString(RRULE.MONTH);
    expect(rule.all()).toHaveLength(RRULE_COUNT_MONTHS);
  });
});
