import { Db, WithoutId } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { Schema_Event } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import { mockGcalEvents } from "../mocks.gcal/mocks.gcal/factories/gcal.event.factory";

/**
 * Simulates the events in the database after gcal import
 * @param {Db} db - The database
 * @returns {Object} - The gcal and compass events
 */
export const simulateDbAfterGcalImport = async (db: Db) => {
  const { gcalEvents, compassEvents } = mockGcalAndCompassEvents();
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
export const mockGcalAndCompassEvents = () => {
  const { gcalEvents } = mockGcalEvents();
  const compassEvents = MapEvent.toCompass(
    "some-user-id",
    gcalEvents.all,
    Origin.GOOGLE_IMPORT,
  );
  return { gcalEvents, compassEvents };
};
