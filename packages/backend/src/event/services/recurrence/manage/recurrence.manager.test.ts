import { Origin } from "@core/constants/core.constants";
import { Priorities } from "@core/constants/core.constants";
import { Summary_SeriesChange_Compass } from "../recurrence.types";
import { shouldSplitSeries } from "./recurrence.manager";

describe("shouldSplitSeries", () => {
  it("should return true if the base event and new base event are different", () => {
    const changes: Summary_SeriesChange_Compass = {
      action: "UPDATE_SERIES",
      baseEvent: {
        description: "",
        endDate: "2025-04-02T10:15:00-05:00",
        isAllDay: false,
        isSomeday: false,
        gEventId: "439ntgoijfbls638nmrprgl6no",
        origin: Origin.GOOGLE_IMPORT,
        priority: Priorities.UNASSIGNED,
        recurrence: {
          rule: ["RRULE:FREQ=DAILY;UNTIL=20250403T045959Z"],
        },
        startDate: "2025-04-02T09:00:00-05:00",
        title: "r1",
        updatedAt: "2025-04-03T13:39:59.196Z",
        user: "67ee8f9dda653b114194d127",
      },
      newBaseEvent: {
        description: "",
        endDate: "2025-04-03T10:15:00-05:00",
        isAllDay: false,
        isSomeday: false,
        gEventId: "439ntgoijfbls638nmrprgl6no_R20250403T140000",
        origin: Origin.GOOGLE_IMPORT,
        priority: Priorities.UNASSIGNED,
        recurrence: {
          rule: ["RRULE:FREQ=DAILY"],
        },
        startDate: "2025-04-03T09:00:00-05:00",
        title: "r1-i",
        updatedAt: "2025-04-03T13:39:59.196Z",
        user: "67ee8f9dda653b114194d127",
      },
      deleteFrom: "DAILY;UNTIL",
    };

    const result = shouldSplitSeries(changes);
    expect(result).toBe(true);
  });
});
