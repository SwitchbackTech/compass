/* eslint-disable @typescript-eslint/no-namespace */
import { gSchema$Event } from "@compass/backend/declarations";
import { notCancelled } from "@compass/backend/src/common/services/gcal/gcal.helpers";

import { BaseError } from "@core/errors/errors.base";
import { Schema_Event } from "../types/event.types";

export namespace MapEvent {
  export const toCompass = (
    userId: string,
    events: gSchema$Event[]
  ): Schema_Event[] => {
    const mapped = events
      .filter(notCancelled)
      .map((e: gSchema$Event) => _toCompass(userId, e));

    return mapped;
  };

  export const toGcal = (
    userId: string,
    event: Schema_Event
  ): gSchema$Event => {
    console.log("reminder: full-day evts not supported yet [mapper]");
    console.log("reminder: only works in server time (CST) [mapper]");

    const gcalEvent = {
      summary: event.title, // TODO only add this field if not undefined
      description: event.description, // TODO only add this field if not undefined
      start: {
        dateTime: new Date(event.startDate).toISOString(), // uses server's time, since no TZ info provided
      },
      end: {
        dateTime: new Date(event.endDate).toISOString(),
      },
    };

    return gcalEvent;
  };
}

const _toCompass = (userId: string, gEvent: gSchema$Event): Schema_Event => {
  // TODO - move to validation service
  if (!gEvent.id) {
    throw new BaseError(
      "Bad Google Event Id",
      "You got a google event without an Id, something is off",
      500,
      false
    );
  }
  //TODO validate that event has either date or dateTime values

  const gEventId = gEvent.id ? gEvent.id : "uh oh";
  const title = gEvent.summary ? gEvent.summary : "untitled";

  const isAllDay = "date" in gEvent.start;

  const compassEvent: Schema_Event = {
    gEventId: gEventId,
    user: userId,
    title: title,
    description: gEvent.description,
    priorities: [],
    startDate: isAllDay ? gEvent.start.date : gEvent.start.dateTime,
    endDate: isAllDay ? gEvent.end.date : gEvent.end.dateTime,

    // temp stuff to update
    priority: "self", // $$ TODO update
    // isTimeSelected: true,
    // isOpen: false,
    // order: 0,
    // groupOrder: 0,
    // groupCount: 0,
  };

  return compassEvent;
};
