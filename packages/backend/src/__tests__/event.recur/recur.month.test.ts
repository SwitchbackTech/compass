import { RRule } from "rrule";
import {
  RRULE,
  RRULE_COUNT_MONTHS,
} from "../../../../core/src/constants/core.constants";
import { assembleEventAndRecurrences } from "../../event/services/event.service.util";

describe("Event Recurrence: Month", () => {
  it("does not use month", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-10-01",
      endDate: "2023-10-07",
      recurrence: {
        rule: [RRULE.MONTH],
      },
    });

    expect(events[0].recurrence).toBeUndefined();
    expect(events[1].recurrence).not.toBeUndefined();
  });
});
