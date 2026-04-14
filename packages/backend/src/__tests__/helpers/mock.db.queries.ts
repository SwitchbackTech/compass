import mongoService from "@backend/common/services/mongo.service";
import { type Event_API } from "@backend/common/types/backend.event.types";
import { type Event_Core, type Schema_Event } from "@core/types/event.types";
import { type Filter } from "mongodb";

export const getCategorizedEventsInDb = async (
  filter?: Filter<Omit<Schema_Event, "_id">>,
) => {
  const allEvents = (await getEventsInDb(filter)) as unknown as Event_Core[];
  const baseEvents = allEvents.filter((e) => e.recurrence?.rule !== undefined);
  const instanceEvents = allEvents.filter(
    (e) => e.recurrence?.eventId !== undefined,
  );
  const regularEvents = allEvents.filter((e) => e.recurrence === undefined);
  return { baseEvents, instanceEvents, regularEvents };
};

export const getEventsInDb = async (
  filter: Filter<Omit<Schema_Event, "_id">> = {},
) => {
  return (await mongoService.event
    .find(filter)
    .toArray()) as unknown as Event_API[];
};

export const isEventCollectionEmpty = async (
  filter: Filter<Omit<Schema_Event, "_id">> = {},
) => {
  return (await mongoService.event.find(filter).toArray()).length === 0;
};
