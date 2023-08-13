import { RRULE } from "../../../../core/src/constants/core.constants";
import { assembleInstances } from "../../event/services/event.service.util";

describe("Event Recurrence: Month", () => {
  it("uses first and last of month", () => {
    const events = assembleInstances({
      startDate: "2023-10-01",
      endDate: "2023-10-31",
      recurrence: {
        rule: [RRULE.MONTH],
      },
    });

    expect(events[0].startDate).toBe("2023-10-01");
    expect(events[0].endDate).toBe("2023-10-31");
    expect(events[1].startDate).toBe("2023-11-01");
    expect(events[1].endDate).toBe("2023-11-30");
    expect(events[2].startDate).toBe("2023-12-01");
    expect(events[2].endDate).toBe("2023-12-31");
    expect(events[3].startDate).toBe("2024-01-01");
    expect(events[3].endDate).toBe("2024-01-31");
  });
});
