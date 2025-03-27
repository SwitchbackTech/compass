import { Schema_Event } from "@core/types/event.types";

export const areDatesUnique = (events: Schema_Event[]) => {
  const starts = new Set(events.map((e) => e.startDate));
  const ends = new Set(events.map((e) => e.endDate));

  const areDatesUnique =
    starts.size === events.length && ends.size === events.length;
  return areDatesUnique;
};

export const childrenUseBaseEventsId = (events: Schema_Event[]) => {
  const base = events[0]?._id?.toString() as string;
  const parentId = base;
  const childrenIds = events.slice(1).map((e) => e.recurrence?.eventId);
  const allSameId = childrenIds.every((id) => id === parentId);

  expect(allSameId).toBe(true);
};

export const haveSharedValues = (events: Schema_Event[]) => {
  const starts = new Set(events.map((e) => e.startDate));
  const ends = new Set(events.map((e) => e.endDate));

  for (const value of starts) {
    if (ends.has(value)) {
      return true;
    }
  }
  return false;
};
export const includesRecurrenceInBase = (events: Schema_Event[]) => {
  const first = events[0] as Schema_Event;
  const second = events[1] as Schema_Event;
  expect(first.recurrence).not.toBeUndefined();
  expect(second.recurrence).not.toBeUndefined();
};

export const onlyOrigHasId = (events: Schema_Event[]) => {
  const first = events[0] as Schema_Event;
  const second = events[1] as Schema_Event;
  const last = events[events.length - 1] as Schema_Event;

  expect(first._id).not.toBeUndefined();
  expect(second._id).toBeUndefined();
  expect(last._id).toBeUndefined();
};

export const usesUniqueDates = (events: Schema_Event[]) => {
  const isUnique = areDatesUnique(events) === true;
  const noRepeats = haveSharedValues(events) === false;

  return isUnique && noRepeats;
};
