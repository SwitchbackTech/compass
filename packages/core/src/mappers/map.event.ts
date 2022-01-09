import { v4 as uuidv4 } from "uuid";

/* eslint-disable @typescript-eslint/no-namespace */
import { gSchema$Event } from "@compass/backend/declarations";
import { notCancelled } from "@compass/backend/src/common/services/gcal/gcal.helpers";

import { BaseError } from "@core/errors/errors.base";
import { Old_Schema_Event, Old_Schema_Event_NoId } from "../types/event.types";

export namespace MapEvent {
  export const toCompass = (
    userId: string,
    events: gSchema$Event[]
  ): Old_Schema_Event[] | Old_Schema_Event_NoId[] => {
    const mapped = events
      .filter(notCancelled)
      .map((e: gSchema$Event) => _toCompass(userId, e));

    return mapped;
  };

  export const toGcal = (
    userId: string,
    event: Old_Schema_Event_NoId
  ): gSchema$Event => {
    const gcalEvent = {
      summary: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
    };

    return gcalEvent;
  };
}

const _toCompass = (
  userId: string,
  gEvent: gSchema$Event
): Old_Schema_Event | Old_Schema_Event_NoId => {
  // TODO - move to validation service
  if (!gEvent.id) {
    throw new BaseError(
      "Bad Google Event Id",
      "You got a google event without an Id, something is off",
      500,
      false
    );
  }
  const gEventId = gEvent.id ? gEvent.id : "uh oh";
  const title = gEvent.summary ? gEvent.summary : "untitled";

  const isAllDay = "date" in gEvent.start;
  const tempId = `${title.substring(0, 4)}-${uuidv4()}`;

  const compassEvent = {
    gEventId: gEventId,
    user: userId,
    title: title,
    description: gEvent.description,
    priorities: [],
    startDate: isAllDay ? gEvent.start.date : gEvent.start?.dateTime,
    endDate: isAllDay ? gEvent.end.date : gEvent.end?.dateTime,
    // $$ Remove start and end after finishing conversion
    end: gEvent.end,
    start: gEvent.start,
    // temp stuff to update
    id: tempId, // use compassId or figure sth else out
    priority: "self", // $$ TODO update
    // isTimeSelected: true,
    // isOpen: false,
    // order: 0,
    // groupOrder: 0,
    // groupCount: 0,
  };

  return compassEvent;
};
