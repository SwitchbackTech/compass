import { Filter } from "mongodb";
import {
  EventSchema,
  Schema_Base_Event,
  Schema_Event,
  Schema_Instance_Event,
} from "@core/types/event.types";
import { gSchema$EventBase } from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";
import {
  categorizeEvents,
  isAllDay,
  isBase,
  isInstance,
} from "@core/util/event/event.util";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import { State_AfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";

/** Utility assertions for the gcal sync processor tests */
export const baseHasRecurrenceRule = async (
  events: Schema_Event[],
  rule: string[],
) => {
  const baseEventsInDb = events.find((e) => isBase(e));

  expect(baseEventsInDb).toBeDefined();
  expect(baseEventsInDb?.["recurrence"]?.["rule"]).toEqual(rule);
};

export const datesAreInUtcOffset = (instance: Schema_Instance_Event) => {
  const instanceStart = instance.startDate;
  const instanceEnd = instance.endDate;

  // Use dayjs to check parsing and offset
  const start = dayjs(instanceStart);
  const end = dayjs(instanceEnd);
  expect(start.isValid()).toBe(true);
  expect(end.isValid()).toBe(true);

  // Confirm offset is present (not Z/UTC)
  expect(start.offsetName()).toBe("UTC");
  expect(end.offsetName()).toBe("UTC");

  // Confirm that the instant in time is correct (string and dayjs agree)
  expect(start.valueOf()).toBe(dayjs(instanceStart).valueOf());
  expect(end.valueOf()).toBe(dayjs(instanceEnd).valueOf());
};

export const eventsMatchSchema = (events: Schema_Event[]) => {
  events.forEach((e) => {
    const result = EventSchema.safeParse(e);
    expect(result.success).toBe(true);
  });
};

export const getLatestEventsFromDb = async (filter?: Filter<Schema_Event>) => {
  const updatedEvents = (await getEventsInDb(filter)) as Schema_Event[];
  const { baseEvents, instances } = categorizeEvents(updatedEvents);
  const base = baseEvents[0];

  return { base, instances };
};

export const hasDifferentDatesAsBase = (
  instance: Schema_Instance_Event,
  updatedBase: gSchema$EventBase,
) => {
  const gTimes = _getGcalDays(updatedBase);
  const cTimes = _getCompassDays(instance);
  const diffStart = gTimes.start !== cTimes.start;
  const diffEnd = gTimes.end !== cTimes.end;

  if (!diffStart || !diffEnd) {
    console.error("Dates/Times are the same:", gTimes, cTimes);
  }

  return diffStart && diffEnd;
};

export const hasSameHourAndMinAsBase = (
  instance: Schema_Instance_Event,
  updatedBase: gSchema$EventBase,
) => {
  const gTimes = _getGcalTimes(updatedBase);
  const cTimes = _getCompassTimes(instance);
  const sameStartHourAndMin =
    gTimes.start.hour === cTimes.start.hour &&
    gTimes.start.minute === cTimes.start.minute;

  const sameEndHourAndMin =
    gTimes.end.hour === cTimes.end.hour &&
    gTimes.end.minute === cTimes.end.minute;

  return sameStartHourAndMin && sameEndHourAndMin;
};

export const noInstancesAfterSplitDate = async (
  events: Schema_Event[],
  splitDateStr: string,
) => {
  const splitDate = new Date(splitDateStr);
  const futureInstances = events.filter(
    (e) => isInstance(e) && new Date(e.startDate) > splitDate,
  );
  expect(futureInstances).toHaveLength(0);
};

export const hasNewUpdatedAtTimestamp = (
  newInstance: Schema_Instance_Event,
  oldInstances: Schema_Instance_Event[],
) => {
  const origInstance = oldInstances.find((i) => i._id === newInstance._id);
  expect(newInstance.updatedAt).not.toEqual(origInstance?.updatedAt);
};

export const instanceDataMatchesGcalBase = (
  cInstance: Schema_Instance_Event,
  gBase: gSchema$EventBase,
) => {
  expect(cInstance.title).toEqual(gBase.summary); // matches gcal payload
  expect(cInstance.description).toEqual(gBase.description); // matches gcal payload
  if (isAllDay(cInstance)) {
    expect(hasDifferentDatesAsBase(cInstance, gBase)).toBe(true); // days should be different
  } else {
    expect(hasSameHourAndMinAsBase(cInstance, gBase)).toBe(true); // times should be same (days will be different)
  }
};

export const instanceDataMatchCompassBase = (
  cInstance: Schema_Instance_Event,
  cBase: Schema_Base_Event,
) => {
  expect(cInstance.title).toEqual(cBase?.title); // matches compass base

  expect(cInstance.recurrence?.eventId).toEqual(cBase._id); // still points to base
};

export const updateBasePayloadToExpireOneDayAfterFirstInstance = (
  gEvents: Omit<
    State_AfterGcalImport["gcalEvents"],
    "all" | "regular" | "cancelled"
  >,
) => {
  if (!gEvents.recurring?.start?.dateTime) {
    throw new Error("Base event missing start date");
  }
  // Get the first instance's start date and add 1 day for the UNTIL date
  const firstInstanceStart = new Date(
    gEvents.instances?.[0]?.start?.dateTime as string,
  );
  const untilDate = new Date(firstInstanceStart);
  untilDate.setDate(untilDate.getDate() + 1);
  const untilDateStr =
    untilDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const gBaseWithUntil = {
    ...gEvents.recurring,
    summary: "Base with UNTIL",
    recurrence: [`RRULE:FREQ=DAILY;UNTIL=${untilDateStr}`], // this event previously had no UNTIL
  };

  return { gBaseWithUntil, untilDateStr };
};

const _getCompassDays = (e: Schema_Event) => {
  const start = dayjs.tz(e.startDate, "UTC");
  const end = dayjs.tz(e.endDate, "UTC");
  return {
    start: { year: start.year(), month: start.month(), date: start.date() },
    end: { year: end.year(), month: end.month(), date: end.date() },
  };
};

const _getGcalDays = (e: gSchema$EventBase) => {
  const start = dayjs.tz(e.start?.dateTime, e.start?.timeZone as string);
  const end = dayjs.tz(e.end?.dateTime, e.end?.timeZone as string);
  return {
    start: { year: start.year(), month: start.month(), date: start.date() },
    end: { year: end.year(), month: end.month(), date: end.date() },
  };
};

const _getCompassTimes = (e: Schema_Event) => {
  const start = dayjs.tz(e.startDate, "UTC");
  const end = dayjs.tz(e.endDate, "UTC");
  return {
    start: { hour: start.hour(), minute: start.minute() },
    end: { hour: end.hour(), minute: end.minute() },
  };
};

const _getGcalTimes = (e: gSchema$EventBase) => {
  const tz = e.start?.timeZone as string;
  const start = dayjs.tz(e.start?.dateTime, tz);
  const end = dayjs.tz(e.end?.dateTime, tz);
  return {
    start: { hour: start.hour(), minute: start.minute() },
    end: { hour: end.hour(), minute: end.minute() },
  };
};
