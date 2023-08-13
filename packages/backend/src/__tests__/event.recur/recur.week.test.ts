import dayjs from "dayjs";
import { RRULE } from "../../../../core/src/constants/core.constants";
import { assembleInstances } from "../../event/services/event.service.util";
import { areDatesUnique, haveSharedValues } from "./recur.util";

describe("Weekly Recurrence: Basics", () => {
  it("uses sunday & saturday as start/end dates", () => {
    const rEvents = assembleInstances({
      startDate: "2023-07-21",
      endDate: "2023-07-22",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });

    const start = dayjs(rEvents[1].startDate);
    const end = dayjs(rEvents[rEvents.length - 1].endDate);

    const isStartSunday = start.day() === 0;
    const isEndSaturday = end.day() === 6;

    expect(isStartSunday).toBe(true);
    expect(isEndSaturday).toBe(true);
  });
});

describe("Weekly Recurrence: Cases", () => {
  it("uses correct dates: case 1", () => {
    const events = assembleInstances({
      startDate: "2023-01-08",
      endDate: "2023-01-14",
      recurrence: { rule: [RRULE.WEEK] },
    });

    expect(events[1].startDate).toBe("2023-01-15");
    expect(events[1].endDate).toBe("2023-01-21");

    expect(events[2].startDate).toBe("2023-01-22");
    expect(events[2].endDate).toBe("2023-01-28");
  });
  it("uses correct dates: case 3: DST (11.5)", () => {
    const events = assembleInstances({
      startDate: "2023-07-23",
      endDate: "2023-07-29",
      recurrence: { rule: [RRULE.WEEK] },
    });

    expect(areDatesUnique(events)).toBe(true);
    expect(haveSharedValues(events)).toBe(false);
  });
});
