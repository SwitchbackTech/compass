import { Event_Core, Schema_Event } from "@core/types/event.types";
import { State_AfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import { isBase, isExistingInstance } from "@backend/event/util/event.util";

/** Utility assertions for the gcal sync processor tests */
export const baseHasRecurrenceRule = async (
  events: Event_Core[],
  rule: string[],
) => {
  const baseEventsInDb = events.find((e) => isBase(e));

  expect(baseEventsInDb).toBeDefined();
  expect(baseEventsInDb?.["recurrence"]?.["rule"]).toEqual(rule);
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
