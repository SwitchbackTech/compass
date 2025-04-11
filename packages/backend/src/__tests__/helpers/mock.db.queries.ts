import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export const getEventsInDb = async () => {
  return await mongoService.db.collection(Collections.EVENT).find().toArray();
};

export const isEventCollectionEmpty = async () => {
  return (
    (await mongoService.db.collection(Collections.EVENT).find().toArray())
      .length === 0
  );
};
