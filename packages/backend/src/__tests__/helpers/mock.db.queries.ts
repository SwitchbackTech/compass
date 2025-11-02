import { Filter } from "mongodb";
import { Schema_Event } from "@core/types/event.types";
import { Schema_Waitlist } from "@core/types/waitlist/waitlist.types";
import { categorizeEvents } from "@core/util/event/event.util";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { getNormalizedEmail } from "@backend/waitlist/service/waitlist.service.util";

export const getCategorizedEventsInDb = async (
  filter?: Filter<Schema_Event>,
) => {
  const allEvents = await getEventsInDb(filter);

  return categorizeEvents(allEvents);
};

export const getEventsInDb = async (
  filter: Filter<Schema_Event> = {},
): Promise<Schema_Event[]> => {
  return await mongoService.event.find(filter).toArray();
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
  const normalizedEmail = getNormalizedEmail(email);
  return (await getEmailsOnWaitlist()).includes(normalizedEmail);
};

export const isEventCollectionEmpty = async (
  filter: Filter<Schema_Event> = {},
) => {
  return (await mongoService.event.find(filter).toArray()).length === 0;
};
