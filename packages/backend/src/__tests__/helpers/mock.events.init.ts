import { Db, ObjectId, WithoutId } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import {
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import { isBase } from "@core/util/event/event.util";
import { Collections } from "@backend/common/constants/collections";
import { mockGcalEvents } from "../mocks.gcal/mocks.gcal/factories/gcal.event.factory";

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
 * Simulates the events in the database after gcal import
 * @param {Db} db - The database
 * @param {string} userId - The user id
 * @returns {Object} - The gcal and compass events
 */
export const simulateDbAfterGcalImport = async (
  db: Db,
  userId: string,
): Promise<State_AfterGcalImport> => {
  const { gcalEvents, compassEvents } = mockGcalAndCompassEvents(userId);
  await db
    .collection(Collections.EVENT)
    .insertMany(compassEvents as unknown as WithoutId<Schema_Event>[]);

  const compassEventsInDb = (await db
    .collection(Collections.EVENT)
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
export const mockGcalAndCompassEvents = (userId?: string) => {
  const { gcalEvents } = mockGcalEvents();
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
    if (isInstance) {
      return {
        ...e,
        recurrence: {
          ...e.recurrence,
          eventId: baseId.toString(),
        },
      };
    }
    return e;
  });
  return { gcalEvents, compassEvents: compassEventsWithPointersToBase };
};
