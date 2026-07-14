import { type Filter } from "mongodb";
import {
  type CompassEvent,
  type ValidatedCompassEvent,
} from "@core/types/compass-event.contracts";
import { type WithObjectId } from "@core/types/type.utils";
import mongoService from "@backend/common/services/mongo.service";

export const getCategorizedEventsInDb = async (
  filter?: Filter<Omit<CompassEvent, "_id">>,
) => {
  const allEvents = (await getEventsInDb(
    filter,
  )) as unknown as ValidatedCompassEvent[];
  const baseEvents = allEvents.filter((e) => e.recurrence?.rule !== undefined);
  const instanceEvents = allEvents.filter(
    (e) => e.recurrence?.eventId !== undefined,
  );
  const regularEvents = allEvents.filter((e) => e.recurrence === undefined);
  return { baseEvents, instanceEvents, regularEvents };
};

export const getEventsInDb = async (
  filter: Filter<Omit<CompassEvent, "_id">> = {},
) => {
  return (await mongoService.event
    .find(filter)
    .toArray()) as unknown as WithObjectId<Omit<ValidatedCompassEvent, "_id">>[];
};

export const isEventCollectionEmpty = async (
  filter: Filter<Omit<CompassEvent, "_id">> = {},
) => {
  return (await mongoService.event.find(filter).toArray()).length === 0;
};
