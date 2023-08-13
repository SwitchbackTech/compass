import { RRule } from "rrule";
import {
  RRULE,
  RRULE_COUNT_MONTHS,
  RRULE_COUNT_WEEKS,
} from "../../../../core/src/constants/core.constants";
import { assembleInstances } from "../../event/services/event.service.util";
import {
  childrenUseBaseEventsId,
  includesRecurrenceInBase,
  onlyOrigHasId,
  usesUniqueDates,
} from "./recur.util";

describe("maps RRULE string to object:", () => {
  it("works for week recurrence", () => {
    const rule = RRule.fromString(RRULE.WEEK);
    expect(rule.all()).toHaveLength(RRULE_COUNT_WEEKS);
  });
  it("works for month recurrence", () => {
    const rule = RRule.fromString(RRULE.MONTH);
    expect(rule.all()).toHaveLength(RRULE_COUNT_MONTHS);
  });
});

describe("includes recurrence object in base event", () => {
  it("works for week events", () => {
    const events = assembleInstances({
      startDate: "2023-10-01",
      endDate: "2023-10-07",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });

    includesRecurrenceInBase(events);
  });
  it("works for month events", () => {
    const events = assembleInstances({
      startDate: "2023-12-31",
      endDate: "2024-01-06",
      recurrence: {
        rule: [RRULE.MONTH],
      },
    });
    includesRecurrenceInBase(events);
  });
});

describe("only predefines the _id for the original event", () => {
  it("works for week events", () => {
    const events = assembleInstances({
      startDate: "2023-09-10",
      endDate: "2023-09-16",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });

    onlyOrigHasId(events);
  });
  it("works for month events", () => {
    const events = assembleInstances({
      startDate: "2023-09-10",
      endDate: "2023-09-16",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });

    onlyOrigHasId(events);
  });
});

describe("returns the original event first", () => {
  it("works for week events", () => {
    const events = assembleInstances({
      startDate: "2023-11-05",
      endDate: "2024-11-11",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });

    expect(events[0].startDate).toBe("2023-11-05");
  });
  it("works for month events", () => {
    const events = assembleInstances({
      startDate: "2023-11-05",
      endDate: "2024-11-11",
      recurrence: {
        rule: [RRULE.MONTH],
      },
    });

    expect(events[0].startDate).toBe("2023-11-05");
  });
});

describe("recurrences use base events id in recurrence field", () => {
  it("works for week events", () => {
    const events = assembleInstances({
      startDate: "2023-11-26",
      endDate: "2023-12-02",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });
    childrenUseBaseEventsId(events);
  });
  it("works for month events", () => {
    const events = assembleInstances({
      startDate: "2023-11-26",
      endDate: "2023-12-02",
      recurrence: {
        rule: [RRULE.MONTH],
      },
    });
    childrenUseBaseEventsId(events);
  });
});

describe("uses expected # of instances", () => {
  it("works for week events", () => {
    const events = assembleInstances({
      startDate: "2023-12-31",
      endDate: "2024-01-06",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });
    expect(events).toHaveLength(RRULE_COUNT_WEEKS + 1);
  });
  it("uses expected # of instances", () => {
    const events = assembleInstances({
      startDate: "2023-08-20",
      endDate: "2023-08-26",
      recurrence: { rule: [RRULE.MONTH] },
    });
    expect(events).toHaveLength(RRULE_COUNT_MONTHS + 1);
  });
});

describe("uses unique dates", () => {
  it("works for week events", () => {
    const events = assembleInstances({
      startDate: "2023-04-09",
      endDate: "2023-04-15",
      recurrence: { rule: [RRULE.WEEK] },
    });
    usesUniqueDates(events);
  });
  it("works for month events", () => {
    const events = assembleInstances({
      startDate: "2023-04-09",
      endDate: "2023-04-15",
      recurrence: { rule: [RRULE.MONTH] },
    });
    usesUniqueDates(events);
  });
});
