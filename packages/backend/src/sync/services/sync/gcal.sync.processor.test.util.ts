import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import {
  Event_Core,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { gSchema$EventBase } from "@core/types/gcal";
import {
  categorizeEvents,
  isBase,
  isExistingInstance,
} from "@core/util/event/event.util";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import { State_AfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";

dayjs.extend(timezone);

/** Utility assertions for the gcal sync processor tests */
export const baseHasRecurrenceRule = async (
  events: Event_Core[],
  rule: string[],
) => {
  const baseEventsInDb = events.find((e) => isBase(e));

  expect(baseEventsInDb).toBeDefined();
  expect(baseEventsInDb?.["recurrence"]?.["rule"]).toEqual(rule);
};

export const getLatestEventsFromDb = async () => {
  const updatedEvents = await getEventsInDb();
  const { baseEvents, instances } = categorizeEvents(updatedEvents);
  const base = baseEvents[0] as Schema_Event_Recur_Base;
  return { base, instances };
};

export const hasDifferentDatesAsBase = (
  instance: Schema_Event_Recur_Instance,
  updatedBase: gSchema$EventBase,
) => {
  const gTimes = _getGcalDays(updatedBase);
  const cTimes = _getCompassDays(instance);
  const diffStartMonthAndDay =
    gTimes.start.month !== cTimes.start.month &&
    gTimes.start.date !== cTimes.start.date;

  const diffEndMonthAndDay =
    gTimes.end.month !== cTimes.end.month &&
    gTimes.end.date !== cTimes.end.date;

  return diffStartMonthAndDay && diffEndMonthAndDay;
};

export const hasSameHourAndMinAsBase = (
  instance: Schema_Event_Recur_Instance,
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
  events: Event_Core[],
  splitDateStr: string,
) => {
  const splitDate = new Date(splitDateStr);
  const futureInstances = events.filter(
    (e) =>
      isExistingInstance(e as unknown as Schema_Event) &&
      new Date(e.startDate) > splitDate,
  );
  expect(futureInstances).toHaveLength(0);
};

export const updateBasePayloadToExpireOneDayAfterFirstInstance = (
  gEvents: State_AfterGcalImport["gcalEvents"],
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

export const datesAreInUtcOffset = (instance: Schema_Event_Recur_Instance) => {
  const instanceStart = instance.startDate;
  const instanceEnd = instance.endDate;
  expect(typeof instanceStart).toBe("string");
  expect(typeof instanceEnd).toBe("string");

  // Use dayjs to check parsing and offset
  const start = dayjs(instanceStart);
  const end = dayjs(instanceEnd);
  expect(start.isValid()).toBe(true);
  expect(end.isValid()).toBe(true);

  // Confirm offset is present (not Z/UTC)
  expect(instanceStart?.endsWith("Z")).toBe(false);
  expect(instanceEnd?.endsWith("Z")).toBe(false);

  // Confirm format matches YYYY-MM-DDTHH:mm:ss±HHmm
  const isoOffsetRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/;
  expect(instanceStart).toMatch(isoOffsetRegex);
  expect(instanceEnd).toMatch(isoOffsetRegex);

  // Confirm that the instant in time is correct (string and dayjs agree)
  expect(start.valueOf()).toBe(dayjs(instanceStart).valueOf());
  expect(end.valueOf()).toBe(dayjs(instanceEnd).valueOf());
};

export const hasNewUpdatedAtTimestamp = (
  newInstance: Schema_Event_Recur_Instance,
  oldInstances: Schema_Event_Recur_Instance[],
) => {
  const origInstance = oldInstances.find((i) => i._id === newInstance._id);
  expect(newInstance.updatedAt).not.toEqual(origInstance?.updatedAt);
};

export const instanceDataMatchesGcalBase = (
  cInstance: Schema_Event_Recur_Instance,
  gBase: gSchema$EventBase,
) => {
  expect(cInstance.title).toEqual(gBase.summary); // matches gcal payload
  expect(cInstance.description).toEqual(gBase.description); // matches gcal payload
  if (cInstance.isAllDay) {
    expect(hasDifferentDatesAsBase(cInstance, gBase)).toBe(true); // days should be different
  } else {
    expect(hasSameHourAndMinAsBase(cInstance, gBase)).toBe(true); // times should be same (days will be different)
  }
};

export const instanceDataMatchCompassBase = (
  cInstance: Schema_Event_Recur_Instance,
  cBase: Schema_Event_Recur_Base,
) => {
  expect(cInstance.title).toEqual(cBase?.title); // matches compass base

  const cBaseId = String(cBase?._id);
  expect(cInstance.recurrence?.eventId).toEqual(cBaseId); // still points to base
};
const _getCompassDays = (e: Schema_Event) => {
  const start = dayjs.tz(e.startDate as string, "UTC");
  const end = dayjs.tz(e.endDate as string, "UTC");
  return {
    start: { year: start.year(), month: start.month(), date: start.date() },
    end: { year: end.year(), month: end.month(), date: end.date() },
  };
};

const _getGcalDays = (e: gSchema$EventBase) => {
  const start = dayjs.tz(
    e.start?.dateTime as string,
    e.start?.timeZone as string,
  );
  const end = dayjs.tz(e.end?.dateTime as string, e.end?.timeZone as string);
  return {
    start: { year: start.year(), month: start.month(), date: start.date() },
    end: { year: end.year(), month: end.month(), date: end.date() },
  };
};

const _getCompassTimes = (e: Schema_Event) => {
  const start = dayjs.tz(e.startDate as string, "UTC");
  const end = dayjs.tz(e.endDate as string, "UTC");
  return {
    start: { hour: start.hour(), minute: start.minute() },
    end: { hour: end.hour(), minute: end.minute() },
  };
};

const _getGcalTimes = (e: gSchema$EventBase) => {
  const tz = e.start?.timeZone as string;
  const start = dayjs.tz(e.start?.dateTime as string, tz);
  const end = dayjs.tz(e.end?.dateTime as string, tz);
  return {
    start: { hour: start.hour(), minute: start.minute() },
    end: { hour: end.hour(), minute: end.minute() },
  };
};
