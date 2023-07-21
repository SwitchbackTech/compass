import dayjs from "dayjs";
import { RRule } from "rrule";
import {
  RRULE,
  RRULE_COUNT_WEEKS,
} from "../../../../core/src/constants/core.constants";
import { Schema_Event } from "../../../../core/src/types/event.types";
import { assembleRecurringEvents } from "../../event/services/event.service.util";

describe("Weekly Recurrence: Basics", () => {
  it("maps RRULE string to object: week", () => {
    const rule = RRule.fromString(RRULE.WEEK);
    expect(rule.all()).toHaveLength(RRULE_COUNT_WEEKS);
  });
  it("uses expected # of instances", () => {
    const events = assembleRecurringEvents({
      startDate: "2023-12-31",
      endDate: "2024-01-06",
      recurrence: [RRULE.WEEK],
    });
    expect(events).toHaveLength(RRULE_COUNT_WEEKS);
  });
  it("uses sunday & saturday as start/end dates", () => {
    const rEvents = assembleRecurringEvents({
      startDate: "2023-07-21",
      endDate: "2023-07-22",
      recurrence: [RRULE.WEEK],
    });

    const start = dayjs(rEvents[0].startDate);
    const end = dayjs(rEvents[rEvents.length - 1].endDate);

    const isStartSunday = start.day() === 0;
    const isEndSaturday = end.day() === 6;

    expect(isStartSunday).toBe(true);
    expect(isEndSaturday).toBe(true);
  });
});

describe("Weekly Recurrence: Cases", () => {
  it("uses correct dates: case 1", () => {
    const events = assembleRecurringEvents({
      startDate: "2023-01-08",
      endDate: "2023-01-14",
      recurrence: [RRULE.WEEK],
    });

    expect(events[0].startDate).toBe("2023-01-15");
    expect(events[0].endDate).toBe("2023-01-21");

    expect(events[1].startDate).toBe("2023-01-22");
    expect(events[1].endDate).toBe("2023-01-28");
  });
  it("uses correct dates: case 2", () => {
    const events = assembleRecurringEvents({
      startDate: "2023-04-09",
      endDate: "2023-04-15",
      recurrence: [RRULE.WEEK],
    });

    expect(_areDatesUnique(events)).toBe(true);
    expect(_haveSharedValues(events)).toBe(false);
  });

  //++
  // it("uses correct dates: case 3: DST (11.5)", () => {
  //   const events = assembleRecurringEvents({
  //     startDate: "2023-07-23",
  //     endDate: "2023-07-29",
  //     recurrence: [RRULE.WEEK],
  //   });

  //   expect(_areDatesUnique(events)).toBe(true);
  //   expect(_haveSharedValues(events)).toBe(false);
  // });
});

const _areDatesUnique = (events: Schema_Event[]) => {
  const starts = new Set(events.map((e) => e.startDate));
  const ends = new Set(events.map((e) => e.endDate));

  const areDatesUnique =
    starts.size === events.length && ends.size === events.length;
  return areDatesUnique;
};

const _haveSharedValues = (events: Schema_Event[]) => {
  const starts = new Set(events.map((e) => e.startDate));
  const ends = new Set(events.map((e) => e.endDate));

  for (const value of starts) {
    if (ends.has(value)) {
      return true;
    }
  }
  return false;
};
