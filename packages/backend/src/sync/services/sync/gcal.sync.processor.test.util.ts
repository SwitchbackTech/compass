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

export const hasSameHourAndMinAsBase = (
  instance: Schema_Event_Recur_Instance,
  updatedBase: gSchema$EventBase,
) => {
  const gBaseStart = new Date(updatedBase.start?.dateTime as string);
  const cInstanceStart = new Date(instance.startDate as string);
  const sameStartHourAndMin =
    gBaseStart.getHours() === cInstanceStart.getHours() &&
    gBaseStart.getMinutes() === cInstanceStart.getMinutes();

  const gBaseEnd = new Date(updatedBase.end?.dateTime as string);
  const cInstanceEnd = new Date(instance.endDate as string);
  const sameEndHourAndMin =
    gBaseEnd.getHours() === cInstanceEnd.getHours() &&
    gBaseEnd.getMinutes() === cInstanceEnd.getMinutes();

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

export const validateInstanceDataMatchesGoogleBase = (
  cInstance: Schema_Event_Recur_Instance,
  gBase: gSchema$EventBase,
) => {
  expect(cInstance.title).toEqual(gBase.summary); // matches gcal payload
  expect(cInstance.description).toEqual(gBase.description); // matches gcal payload
  expect(hasSameHourAndMinAsBase(cInstance, gBase)).toBe(true); // times should be same (days will be different)
};

export const validateInstanceDataMatchCompassBase = (
  cInstance: Schema_Event_Recur_Instance,
  cBase: Schema_Event_Recur_Base,
) => {
  expect(cInstance.title).toEqual(cBase?.title); // matches compass base

  const cBaseId = String(cBase?._id);
  expect(cInstance.recurrence?.eventId).toEqual(cBaseId); // still points to base
};

export const validateHasNewUpdatedAtTimestamp = (
  newInstance: Schema_Event_Recur_Instance,
  oldInstances: Schema_Event_Recur_Instance[],
) => {
  const origInstance = oldInstances.find((i) => i._id === newInstance._id);
  expect(newInstance.updatedAt).not.toEqual(origInstance?.updatedAt);
};
