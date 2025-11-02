import type { GaxiosPromise } from "gaxios";
import { calendar_v3 } from "googleapis";
import { ObjectId } from "mongodb";
import { Options } from "rrule";
import { Origin } from "@core/constants/core.constants";
import { MapGCalEvent } from "@core/mappers/map.gcal.event";
import { Schema_Event } from "@core/types/event.types";
import {
  gCalendar,
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import { mockGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";

export interface State_AfterGcalImport {
  gcalEvents: {
    all: (gSchema$Event | gSchema$EventBase | gSchema$EventInstance)[];
    regular: gSchema$Event;
    cancelled: gSchema$Event;
    recurring: gSchema$EventBase;
    instances: gSchema$EventInstance[];
  };
  compassEvents: Schema_Event[];
}
/**
 * simulateGoogleCalendarEventCreation
 *
 * Simulates the creation of a Google Calendar event.
 * This is used to mock the Google Calendar API's event creation.
 * and should be called when a gcal event mock is created.
 */
export const simulateGoogleCalendarEventCreation = async (
  gCalendarId: string,
  event: gSchema$Event,
  gcal: gCalendar,
): GaxiosPromise<calendar_v3.Schema$Event> => {
  return gcal.events.insert({ requestBody: event, calendarId: gCalendarId });
};

/**
 * Generates mock compass events from gcal events
 * @returns {Object} - The gcal and compass events
 */
export const mockGcalAndCompassEvents = (
  calendar: ObjectId,
  isAllDayBase = false,
  recurrenceOptions?: Partial<Options>,
) => {
  const { gcalEvents } = mockGcalEvents(isAllDayBase, recurrenceOptions);

  const compassEvents = MapGCalEvent.toEvents(
    calendar,
    gcalEvents.all,
    Origin.GOOGLE_IMPORT,
  );

  return { gcalEvents, compassEvents };
};
