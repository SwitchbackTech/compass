import { type ClientSession } from "mongodb";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export const deleteAllByGcalId = (
  gCalendarId: string,
  session?: ClientSession,
) => {
  return mongoService.sync.deleteMany(
    { "google.events.gCalendarId": gCalendarId },
    { session },
  );
};

export const deleteAllByUser = (userId: string, session?: ClientSession) => {
  return mongoService.sync.deleteMany({ user: userId }, { session });
};

export const deleteByIntegration = (integration: "google", userId: string) => {
  return mongoService.db
    .collection(Collections.SYNC)
    .updateOne({ user: userId }, { $unset: { [integration]: "" } });
};

const syncRecords = {
  deleteAllByGcalId,
  deleteAllByUser,
  deleteByIntegration,
};

export default syncRecords;
