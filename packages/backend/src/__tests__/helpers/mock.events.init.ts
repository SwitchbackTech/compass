import { ObjectId, WithoutId } from "mongodb";
import { Options } from "rrule";
import { calendar } from "@googleapis/calendar";
import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import {
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import { isBase } from "@core/util/event/event.util";
import { mockGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export interface State_AfterGcalImport {
  gcalEvents: {
    all: (gSchema$Event | gSchema$EventBase | gSchema$EventInstance)[];
    regular: gSchema$Event;
    cancelled: gSchema$Event;
    recurring: gSchema$EventBase;
    instances: gSchema$EventInstance[];
  };
  compassEvents: WithCompassId<Schema_Event>[];
}
/**
 * simulateGoogleCalendarEventCreation
 *
 * Simulates the creation of a Google Calendar event.
 * This is used to mock the Google Calendar API's event creation.
 * and should be called when a gcal event mock is created.
 */
export const simulateGoogleCalendarEventCreation = async (
  event: gSchema$Event,
) => {
  return calendar({ version: "v3" }).events.insert({ requestBody: event });
};

/**
 * Simulates the events in the database after gcal import
 * @param {Db} db - The database
 * @param {string} userId - The user id
 * @returns {Object} - The gcal and compass events
 */
export const simulateDbAfterGcalImport = async (
  userId: string,
  isAllDayBase = false,
  recurrenceOptions: Partial<Options> = {},
): Promise<State_AfterGcalImport> => {
  const { gcalEvents, compassEvents } = mockGcalAndCompassEvents(
    userId,
    isAllDayBase,
    recurrenceOptions,
  );

  const { instances, recurring, regular } = gcalEvents;

  await Promise.all(
    [regular, recurring, ...instances].map(simulateGoogleCalendarEventCreation),
  );

  await mongoService.db
    .collection(Collections.EVENT)
    .insertMany(compassEvents as unknown as WithoutId<Schema_Event>[]);

  const compassEventsInDb = (await mongoService.event
    .find({})
    .toArray()) as unknown as WithCompassId<Schema_Event>[];
  return {
    gcalEvents,
    compassEvents: compassEventsInDb,
  };
};

/**
 * Generates mock compass events from gcal events
 * @returns {Object} - The gcal and compass events
 */
export const mockGcalAndCompassEvents = (
  userId?: string,
  isAllDayBase = false,
  recurrenceOptions?: Partial<Options>,
) => {
  const { gcalEvents } = mockGcalEvents(isAllDayBase, recurrenceOptions);
  const compassEvents = MapEvent.toCompass(
    userId || "some-user-id",
    gcalEvents.all,
    Origin.GOOGLE_IMPORT,
  );
  const compassBase = compassEvents.find((e) => isBase(e));
  if (!compassBase) {
    throw new Error("No base event found");
  }

  // Link instances to their base
  const baseId = new ObjectId();
  // @ts-expect-error pre-assigning the id as ObjectId is OK if you insert it afterwards
  compassBase._id = baseId;
  const compassEventsWithPointersToBase = compassEvents.map((e) => {
    const isInstance = e.gRecurringEventId !== undefined;
    if (isInstance) return { ...e, recurrence: { eventId: baseId.toString() } };

    return e;
  });
  return { gcalEvents, compassEvents: compassEventsWithPointersToBase };
};
