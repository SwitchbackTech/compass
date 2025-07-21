import { Filter } from "mongodb";
import { Event_Core, Schema_Event } from "@core/types/event.types";
import { Schema_Waitlist } from "@core/types/waitlist/waitlist.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Event_API } from "@backend/common/types/backend.event.types";

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

export const getEmailsOnWaitlist = async () => {
  const waitlist = (await mongoService.db
    .collection(Collections.WAITLIST)
    .find()
    .toArray()) as unknown as Schema_Waitlist[];

  const emails = waitlist.map((w) => w.email);
  return emails;
};

export const isEmailOnWaitlist = async (email: string) => {
  return (await getEmailsOnWaitlist()).includes(email);
};

export const isEventCollectionEmpty = async (
  filter: Filter<Omit<Schema_Event, "_id">> = {},
) => {
  return (await mongoService.event.find(filter).toArray()).length === 0;
};
