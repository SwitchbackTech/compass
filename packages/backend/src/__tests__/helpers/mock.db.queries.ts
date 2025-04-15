import { Event_Core, WithCompassId } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export const getCategorizedEventsInDb = async () => {
  const allEvents = (await getEventsInDb()) as unknown as Event_Core[];
  const baseEvents = allEvents.filter((e) => e.recurrence?.rule !== undefined);
  const instanceEvents = allEvents.filter(
    (e) => e.recurrence?.eventId !== undefined,
  );
  const regularEvents = allEvents.filter((e) => e.recurrence === undefined);
  return { baseEvents, instanceEvents, regularEvents };
};

export const getEventsInDb = async () => {
  return (await mongoService.db
    .collection(Collections.EVENT)
    .find()
    .toArray()) as unknown as WithCompassId<Event_Core>[];
};

export const isEventCollectionEmpty = async () => {
  return (
    (await mongoService.db.collection(Collections.EVENT).find().toArray())
      .length === 0
  );
};
