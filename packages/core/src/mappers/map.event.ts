/* eslint-disable @typescript-eslint/no-namespace */
import { Origin, Priorities, Priority } from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import { Event_Core, Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { isAllDay, notCancelled } from "@core/util/event.util";
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

  const gEventId = gEvent.id ? gEvent.id : "uh oh";
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const _origPriority = gEvent.extendedProperties?.private?.["priority"];
  const _priority =
    _origPriority === undefined
      ? Priorities.UNASSIGNED
      : (_origPriority as Priority);

  const compassEvent: Schema_Event = {
    gEventId: gEventId,
    user: userId,
    origin: _origin as Origin,
    title: title,
    description: description,
    priorities: [],
    isAllDay: _isAllDay,
    isSomeday: false,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    // @ts-ignore
    startDate: _isAllDay ? _start.date : _start.dateTime,
    // @ts-ignore
    endDate: _isAllDay ? _end.date : _end.dateTime,
    priority: _priority,
    updatedAt: new Date(),
  };

  const validatedCompassEvent = validateEvent(compassEvent);
  return validatedCompassEvent;
};
