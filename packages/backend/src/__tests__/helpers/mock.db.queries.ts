import { type Filter } from "mongodb";
import {
  type LegacyEvent,
  type ValidatedLegacyEvent,
} from "@core/types/legacy-event.contracts";
import { type WithObjectId } from "@core/types/type.utils";
import mongoService from "@backend/common/services/mongo.service";

export const getCategorizedEventsInDb = async (
  filter?: Filter<Omit<LegacyEvent, "_id">>,
) => {
  const allEvents = (await getEventsInDb(
    filter,
  )) as unknown as ValidatedLegacyEvent[];
  const baseEvents = allEvents.filter((e) => e.recurrence?.rule !== undefined);
  const instanceEvents = allEvents.filter(
    (e) => e.recurrence?.eventId !== undefined,
  );
  const regularEvents = allEvents.filter((e) => e.recurrence === undefined);
  return { baseEvents, instanceEvents, regularEvents };
};

export const getEventsInDb = async (
  filter: Filter<Omit<LegacyEvent, "_id">> = {},
) => {
  return (await mongoService.event
    .find(filter)
    .toArray()) as unknown as WithObjectId<Omit<ValidatedLegacyEvent, "_id">>[];
};

export const isEventCollectionEmpty = async (
  filter: Filter<Omit<LegacyEvent, "_id">> = {},
) => {
  return (await mongoService.event.find(filter).toArray()).length === 0;
};
