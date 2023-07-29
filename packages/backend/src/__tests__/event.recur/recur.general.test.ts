import { RRule } from "rrule";
import {
  RRULE,
  RRULE_COUNT_MONTHS,
  RRULE_COUNT_WEEKS,
} from "../../../../core/src/constants/core.constants";
import { Schema_Event } from "../../../../core/src/types/event.types";
import { assembleEventAndRecurrences } from "../../event/services/event.service.util";

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

describe("omits recurrence object from base event", () => {
  it("works for week events", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-10-01",
      endDate: "2023-10-07",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });

    _noRecurrenceInBase(events);
  });
  it("works for month events", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-12-31",
      endDate: "2024-01-06",
      recurrence: {
        rule: [RRULE.MONTH],
      },
    });
    _noRecurrenceInBase(events);
  });
});

describe("only predefines the _id for the original event", () => {
  it("works for week events", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-09-10",
      endDate: "2023-09-16",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });

    _onlyOrigHasId(events);
  });
  it("works for month events", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-09-10",
      endDate: "2023-09-16",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });

    _onlyOrigHasId(events);
  });
});

describe("returns the original event first", () => {
  it("works for week events", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-11-05",
      endDate: "2024-11-11",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });

    expect(events[0].startDate).toBe("2023-11-05");
  });
  it("works for month events", () => {
    const events = assembleEventAndRecurrences({
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
    const events = assembleEventAndRecurrences({
      startDate: "2023-11-26",
      endDate: "2023-12-02",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });
    _childrenUseBaseEventsId(events);
  });
  it("works for month events", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-11-26",
      endDate: "2023-12-02",
      recurrence: {
        rule: [RRULE.MONTH],
      },
    });
    _childrenUseBaseEventsId(events);
  });
});

describe("uses expected # of instances", () => {
  it("works for week events", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-12-31",
      endDate: "2024-01-06",
      recurrence: {
        rule: [RRULE.WEEK],
      },
    });
    expect(events).toHaveLength(RRULE_COUNT_WEEKS + 1);
  });
  it("uses expected # of instances", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-08-20",
      endDate: "2023-08-26",
      recurrence: { rule: [RRULE.MONTH] },
    });
    expect(events).toHaveLength(RRULE_COUNT_MONTHS + 1);
  });
});

describe("uses unique dates", () => {
  it("works for week events", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-04-09",
      endDate: "2023-04-15",
      recurrence: { rule: [RRULE.WEEK] },
    });
    _usesUniqueDates(events);
  });
  it("works for month events", () => {
    const events = assembleEventAndRecurrences({
      startDate: "2023-04-09",
      endDate: "2023-04-15",
      recurrence: { rule: [RRULE.MONTH] },
    });
    _usesUniqueDates(events);
  });
});

const _areDatesUnique = (events: Schema_Event[]) => {
  const starts = new Set(events.map((e) => e.startDate));
  const ends = new Set(events.map((e) => e.endDate));

  const areDatesUnique =
    starts.size === events.length && ends.size === events.length;
  return areDatesUnique;
};

const _childrenUseBaseEventsId = (events: Schema_Event[]) => {
  const parentId = events[0]._id.toString();
  const childrenIds = events.slice(1).map((e) => e.recurrence?.eventId);
  const allSameId = childrenIds.every((id) => id === parentId);

  expect(allSameId).toBe(true);
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

const _noRecurrenceInBase = (events: Schema_Event[]) => {
  expect(events[0].recurrence).toBeUndefined();
  expect(events[1].recurrence).not.toBeUndefined();
};

const _onlyOrigHasId = (events: Schema_Event[]) => {
  expect(events[0]._id).not.toBeUndefined();
  expect(events[1]._id).toBeUndefined();
  expect(events[events.length - 1]._id).toBeUndefined();
};

const _usesUniqueDates = (events: Schema_Event[]) => {
  const isUnique = _areDatesUnique(events) === true;
  const noRepeats = _haveSharedValues(events) === false;

  return isUnique && noRepeats;
};
