import { Db, ObjectId, WithoutId } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { Schema_Event } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import { isBase } from "@backend/event/services/recur/util/recur.util";
import { mockGcalEvents } from "../mocks.gcal/mocks.gcal/factories/gcal.event.factory";

/**
 * Simulates the events in the database after gcal import
 * @param {Db} db - The database
 * @param {string} userId - The user id
 * @returns {Object} - The gcal and compass events
 */
export const simulateDbAfterGcalImport = async (db: Db, userId?: string) => {
  const { gcalEvents, compassEvents } = mockGcalAndCompassEvents(userId);
  await db
    .collection(Collections.EVENT)
    .insertMany(compassEvents as unknown as WithoutId<Schema_Event>[]);

  const compassEventsInDb = await db
    .collection(Collections.EVENT)
    .find({})
    .toArray();
  return { gcalEvents, compassEventsInDb };
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
  const baseId = new ObjectId();
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
