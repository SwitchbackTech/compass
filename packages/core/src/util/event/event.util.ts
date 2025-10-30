import {
  BaseEventSchema,
  InstanceEventSchema,
  RecurrenceRuleSchema,
  RegularEventSchema,
  Schema_Base_Event,
  Schema_Event,
  Schema_Instance_Event,
} from "@core/types/event.types";
import { UserMetadata } from "@core/types/user.types";
import dayjs from "@core/util/date/dayjs";

/** Event utilities for Compass events */

export const categorizeEvents = (events: Schema_Event[]) => {
  const baseEvents = events.filter(isBase) as Schema_Base_Event[];
  const instances = events.filter(isInstance) as Schema_Instance_Event[];
  const regularEvents = events.filter(isRegularEvent);

  return { baseEvents, instances, regularEvents };
};

export const categorizeRecurringEvents = (
  events: Array<Schema_Base_Event | Schema_Instance_Event>,
) => {
  const baseEvent = events.find(isBase) as Schema_Base_Event;
  const instances = events.filter(
    (e) => e !== baseEvent,
  ) as Schema_Instance_Event[];
  return { baseEvent, instances };
};

/**
 * isAllDay
 *
 * determine if an event is an all-day event
 * this method assumes minute precision for event's time range
 */
export const isAllDay = (
  event: Pick<Schema_Event, "startDate" | "endDate">,
) => {
  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);
  const sameDay = start.add(1, "day").isSame(end, "day");
  const startOfDay = start.startOf("day").isSame(start);
  const startOfNextDay = end.startOf("day").isSame(end);

  return sameDay && startOfDay && startOfNextDay;
};

export const hasRRule = (event: Pick<Schema_Event, "recurrence">): boolean => {
  return RecurrenceRuleSchema.safeParse(event.recurrence?.rule).success;
};

/**
 * Instance compass events have an `eventId` and an empty `rule` within their `recurrence` field
 * @param event
 * @returns
 */
export const isInstance = (
  event: Pick<Schema_Event, "_id" | "recurrence">,
): boolean => InstanceEventSchema.safeParse(event).success;

/**
 * Base compass events have an _id field same as their `recurrence.eventId` field
 * @param event
 * @returns
 */
export const isBase = (
  event: Pick<Schema_Event, "_id" | "recurrence">,
): boolean => BaseEventSchema.safeParse(event).success;

export const isRegularEvent = (
  event: Pick<Schema_Event, "recurrence">,
): boolean => RegularEventSchema.safeParse(event).success;

/**
 * Filters the base events
 * @param e - The events array
 * @returns The base events
 */
export const filterBaseEvents = (e: Schema_Event[]): Schema_Base_Event[] => {
  return e.filter(isBase) as Schema_Base_Event[];
};

/**
 * Filters the recurring events (base or instance)
 * @param e - The events array
 * @returns The recurring events (base or instance)
 */
export const filterExistingInstances = (e: Schema_Event[]) =>
  e.filter(isInstance) as Schema_Instance_Event[];

export const shouldImportGCal = (metadata: UserMetadata): boolean => {
  const sync = metadata.sync;

  switch (sync?.importGCal) {
    case "importing":
    case "completed":
      return false;
    case "restart":
    case "errored":
    default:
      return true;
  }
};
