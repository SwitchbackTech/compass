/* eslint-disable @typescript-eslint/no-namespace */
import { Origin, Priorities } from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import { Event_Core, Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { isAllDay } from "@core/util/event/event.util";
import { notCancelled } from "@core/util/event/gcal.event.util";
import { validateEvent } from "@core/validators/event.validator";

export namespace MapEvent {
  export const toCompass = (
    userId: string,
    events: gSchema$Event[],
    origin?: Origin,
  ): Event_Core[] => {
    const mapped = events
      .filter(notCancelled)
      .map((e: gSchema$Event) => _toCompass(userId, e, origin));

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

const _toCompass = (
  userId: string,
  gEvent: gSchema$Event,
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
  const _origin =
    origin !== undefined
      ? origin
      : gEvent.extendedProperties?.private?.["origin"] || Origin.UNSURE;

  const gEventId = gEvent.id ? gEvent.id : undefined;

  const title = gEvent.summary ? gEvent.summary : "untitled";
  const description = gEvent.description ? gEvent.description : "";

  const placeHolder = {
    start: {
      date: "1990-01-01",
      dateTime: "1990-01-01T00:00:00-10:00",
    },
    end: {
      date: "1990-01-01",
      dateTime: "1990-01-01T00:00:00-10:00",
    },
  };

  const _start = gEvent.start == undefined ? placeHolder.start : gEvent.start;
  const _end = gEvent.end === undefined ? placeHolder.end : gEvent.end;
  const _isAllDay = gEvent.start !== undefined && "date" in gEvent.start;
  const priority = getPriority(gEvent);

  const compassEvent: Schema_Event = {
    gEventId: gEventId,
    user: userId,
    origin: _origin as Origin,
    title: title,
    description: description,
    priorities: [],
    isAllDay: _isAllDay,
    isSomeday: false,
    // @ts-ignore
    startDate: _isAllDay ? _start.date : _start.dateTime,
    // @ts-ignore
    endDate: _isAllDay ? _end.date : _end.dateTime,
    priority,
    updatedAt: new Date(),
  };

  const recurrence = getRecurrence(gEvent);
  // Only add recurrence if it's defined
  if (recurrence) {
    compassEvent.recurrence = recurrence;
  }
  const gRecurringEventId = gEvent.recurringEventId;
  if (gRecurringEventId) {
    compassEvent.gRecurringEventId = gRecurringEventId;
  }

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
