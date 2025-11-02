import microDiff from "microdiff";
import type { UpdateFilter } from "mongodb";
import { z } from "zod/v4";
import type {
  Schema_Base_Event,
  Schema_Event,
  Schema_Instance_Event,
  Schema_Regular_Event,
} from "@core/types/event.types";
import {
  BaseEventSchema,
  InstanceEventMetadata,
  InstanceEventSchema,
  RecurrenceRuleSchema,
  RegularEventSchema,
} from "@core/types/event.types";
import { UserMetadata } from "@core/types/user.types";
import dayjs from "@core/util/date/dayjs";
import { StringV4Schema } from "../../types/type.utils";

// as type only as package does not exist in core

/** Event utilities for Compass events */

export const categorizeEvents = (events: Schema_Event[]) => {
  const baseEvents = events.filter(isBase).map((e) => BaseEventSchema.parse(e));
  const instances = events
    .filter(isInstance)
    .map((e) => InstanceEventSchema.parse(e));
  const regularEvents = events
    .filter(isRegular)
    .map((e) => RegularEventSchema.parse(e));

  return { baseEvents, instances, regularEvents };
};

export const categorizeRecurringEvents = (
  events: Array<Schema_Base_Event | Schema_Instance_Event>,
) => {
  const baseEvent = events.filter(isBase).map((e) => BaseEventSchema.parse(e));
  const instances = events
    .filter(isInstance)
    .map((e) => InstanceEventSchema.parse(e));

  if (baseEvent.length !== 1) {
    throw new Error(
      `Expected exactly one base event, found ${baseEvent.length}`,
    );
  }

  return { baseEvent: baseEvent[0], instances };
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

export const isRegular = (event: Pick<Schema_Event, "recurrence">): boolean =>
  RegularEventSchema.safeParse(event).success;

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

export function isArrayLike(value: unknown): boolean {
  try {
    return Object.entries(z.object().parse(value)).every(([key]) => {
      return z.coerce.number().int().min(0).safeParse(key).success;
    });
  } catch {
    return false;
  }
}

/**
 * getMongoUpdateDiff
 *
 * Gets the difference between two objects,
 * returning only the fields that have changed
 * in a format suitable for MongoDB updates
 */
export function getMongoUpdateDiff<T extends object = Record<string, unknown>>(
  updated: T,
  existing?: T | null,
): Pick<UpdateFilter<T>, "$set" | "$unset"> {
  const changes: Pick<UpdateFilter<T>, "$set" | "$unset"> = {};
  const diff = microDiff(existing ?? {}, updated ?? {}, { cyclesFix: false });

  diff.forEach((change) => {
    const { path, type } = change;
    const hasValue =
      "value" in change && ![undefined, null].includes(change.value);
    const metaKey = type === "REMOVE" ? "$unset" : hasValue ? "$set" : "$unset";
    const key = StringV4Schema.parse(path[0]);

    if (!(metaKey in changes)) Object.assign(changes, { [metaKey]: {} });

    const metaField = changes[metaKey] as object;

    switch (type) {
      case "REMOVE":
        Object.assign(metaField, { [key]: "" });
        break;
      case "CREATE":
      case "CHANGE":
      default: {
        if (!hasValue) {
          Object.assign(metaField, { [key]: "" });
        } else {
          Object.assign(metaField, { [key]: updated[key as keyof T] });
        }
        break;
      }
    }
  });

  return changes;
}

export function getEditableEventDiff<
  T extends object = Record<string, unknown>,
>(updated: T, existing?: T | null): Partial<T> {
  const changes: Partial<T> = {};
  const diff = microDiff(existing ?? {}, updated ?? {}, { cyclesFix: false });
  const editableFields: string[] = [
    "title",
    "description",
    "isSomeday",
    "startDate",
    "endDate",
    "order",
    "priority",
    "recurrence",
    "updatedAt",
  ];

  diff.forEach((change) => {
    const { path } = change;
    const key = StringV4Schema.parse(path[0]);

    if (!editableFields.includes(key)) return;

    Object.assign(changes, { [key]: updated[key as keyof T] });
  });

  return changes;
}

export function mergeTimeFromDate(original: Date, update?: Date) {
  original.setHours(update?.getHours() ?? original.getHours());
  original.setMinutes(update?.getMinutes() ?? original.getMinutes());
  original.setSeconds(update?.getSeconds() ?? original.getSeconds());
  original.setMilliseconds(
    update?.getMilliseconds() ?? original.getMilliseconds(),
  );

  return original;
}

export const dateSchemaCheck: z.core.CheckFn<Schema_Event> = ({
  value,
  issues,
}) => {
  const valid = dayjs(value.endDate).isAfter(dayjs(value.startDate));

  if (!valid) {
    issues.push({
      code: "invalid_value",
      input: value,
      message: "invalid event date range. startDate must be before endDate",
      values: [],
    });
  }
};

export const noRecurrenceSchemaCheck: z.core.CheckFn<Schema_Regular_Event> = ({
  value,
  issues,
}) => {
  const valid =
    !("recurrence" in value) ||
    value.recurrence === undefined ||
    value.recurrence === null;

  if (!valid) {
    issues.push({
      code: "invalid_value",
      input: value,
      message: "invalid regular event",
      values: [],
    });
  }
};

export const baseRecurrenceSchemaCheck: z.core.CheckFn<Schema_Base_Event> = ({
  value,
  issues,
}) => {
  // review check to have eventId equal to _id
  const valid = value.recurrence?.eventId?.equals(value._id);

  if (!valid) {
    issues.push({
      code: "invalid_value",
      input: value,
      message: "base recurrence event id mismatch",
      values: [],
    });
  }
};

export const instanceRecurrenceSchemaCheck: z.core.CheckFn<
  Schema_Instance_Event
> = ({ value, issues }) => {
  // review check to have eventId not equal to _id
  const valid = !value.recurrence?.eventId?.equals(value._id);

  if (!valid) {
    issues.push({
      code: "invalid_value",
      input: value,
      message: "invalid recurrence event id",
      values: [],
    });
  }
};

export const instanceMetadataSchemaCheck: z.core.CheckFn<
  InstanceEventMetadata
> = ({ value, issues }) => {
  // review check to be provider neutral in multi-provider scenario
  const valid = new RegExp(
    `^${value.recurringEventId}_\\d+(T\\d+Z?)?$`,
    "i",
  ).test(value.id);

  if (!valid) {
    issues.push({
      code: "invalid_value",
      input: value,
      message: "Invalid instance id",
      values: [],
    });
  }
};
