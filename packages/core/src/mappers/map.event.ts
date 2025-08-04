/* eslint-disable @typescript-eslint/no-namespace */
import mergeWith from "lodash.mergewith";
import { Origin, Priorities } from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import { Event_Core, Schema_Event } from "@core/types/event.types";
import { WithGcalId, gSchema$Event } from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";
import { isAllDay } from "@core/util/event/event.util";
import { isCancelledGCalEvent } from "@core/util/event/gcal.event.util";
import { validateEvent } from "@core/validators/event.validator";

export namespace MapEvent {
  export const toCompass = (
    userId: string,
    events: gSchema$Event[],
    origin?: Origin,
  ): Event_Core[] => {
    const mapped = events
      .filter((event) => !isCancelledGCalEvent(event))
      .map((e: gSchema$Event) => gEventToCompassEvent(e, userId, origin));

    return mapped;
  };

  export const toGcal = (event: Schema_Event): gSchema$Event => {
    const dateKey = isAllDay(event) ? "date" : "dateTime";

    const gcalEvent: gSchema$Event = {
      summary: event.title, // TODO only add this field if not undefined
      description: event.description, // TODO only add this field if not undefined
      start: { [dateKey]: event.startDate },
      end: { [dateKey]: event.endDate },
      extendedProperties: {
        private: {
          // capture where event came from to later decide how to
          // sync changes between compass and integrations
          origin: event.origin || Origin.UNSURE,
          priority: event.priority || Priorities.UNASSIGNED,
        },
      },
    };

    return gcalEvent;
  };
}

const gEventDefaults = {
  summary: "untitled",
  description: "",
  start: {
    dateTime: "1990-01-01T00:00:00-10:00",
    timeZone: dayjs.tz.guess(),
  },
  end: {
    dateTime: "1990-01-01T00:00:00-10:00",
    timeZone: dayjs.tz.guess(),
  },
};

export const gEventToCompassEvent = (
  gEvent: gSchema$Event,
  userId: string,
  origin?: Origin,
): Event_Core => {
  if (!gEvent.id) {
    throw new BaseError(
      "Bad Google Event Id",
      "You got a google event without an Id, something is off",
      500,
      false,
    );
  }

  if (typeof gEvent.start === "string" && typeof gEvent.end === "string") {
    throw new BaseError(
      "Bad Google Event Date",
      "You got a google event with start `date` and `dateTime` field, something is off",
      500,
      false,
    );
  }

  const event: WithGcalId<gSchema$Event> = mergeWith(
    {},
    gEventDefaults,
    gEvent,
  );

  const { id: gEventId, description } = event;
  const title = event.summary!;
  const isAllDay = !!event.start && "date" in event.start;
  const priority = getPriority(event);
  // @TODO: - https://github.com/SwitchbackTech/compass/issues/607
  // we need to save the dates as UTC -and migrate existing event dates
  // so we can afford to disregard the timezone
  // we cannot rely on timestamp offset in the event date string;
  // const startDate = parseGCalEventDate(event.start).format();
  // const endDate = parseGCalEventDate(event.end).format();
  // we do this for compatibility for now
  const startDate = isAllDay ? event.start?.date : event.start?.dateTime;
  const endDate = isAllDay ? event.end?.date : event.end?.dateTime;

  const _origin =
    origin ?? event.extendedProperties?.private?.["origin"] ?? Origin.UNSURE;

  const compassEvent: Schema_Event = {
    gEventId,
    user: userId,
    origin: _origin as Origin,
    title,
    description,
    isAllDay,
    isSomeday: false,
    startDate: startDate!,
    endDate: endDate!,
    priority,
    updatedAt: new Date(),
  };

  const recurrence = getRecurrence(event);

  // Only add recurrence if it's defined
  if (recurrence) compassEvent.recurrence = recurrence;

  const gRecurringEventId = event.recurringEventId;

  if (gRecurringEventId) compassEvent.gRecurringEventId = gRecurringEventId;

  const validatedCompassEvent = validateEvent(compassEvent);

  return validatedCompassEvent;
};

const getPriority = (gEvent: gSchema$Event): Priorities => {
  const priorityExists =
    gEvent.extendedProperties?.private?.["priority"] !== undefined &&
    gEvent.extendedProperties?.private?.["priority"] !== null;
  if (priorityExists) {
    const priority = gEvent.extendedProperties?.private?.["priority"];
    if (
      priority &&
      Object.values(Priorities).includes(priority as Priorities)
    ) {
      return priority as Priorities;
    }
    // Found a priority that doesn't match enum, set to unassigned
    console.warn(
      `Found a priority that doesn't match enum: ${priority}. Using ${Priorities.UNASSIGNED} instead. (gEvent.id: ${gEvent.id})`,
    );
    return Priorities.UNASSIGNED;
  }
  return Priorities.UNASSIGNED;
};

const getRecurrence = (gEvent: gSchema$Event) => {
  const recurrenceExists =
    gEvent.recurrence !== undefined && gEvent.recurrence !== null;
  if (recurrenceExists) {
    return {
      rule: gEvent.recurrence as string[],
    };
  }
  return undefined;
};
