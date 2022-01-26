import { Result_Stop_Watch } from "@core/types/sync.types";
import { Logger } from "@backend/common/logger/common.logger";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";

const logger = Logger("app:sync.service");

/* Sync functions that are meant for development only */

class DevService {
  async deleteWatchInfo(userId: string, channelId: string, resourceId: string) {
    const delWatchInfo = await mongoService.db
      .collection(Collections.DEV_WATCHLOG_GCAL)
      .deleteOne({ userId, channelId, resourceId });

    const deleteForDev = delWatchInfo.acknowledged ? "success" : "failed";
    return deleteForDev;
  }

  /* 
  Saving every watch request and associating it with a user helps development,
  by allowing a script to stop every existing channel watch for user X
    - This isn't possible using the calendarlist collection, since only the latest
      watch info is saved there
    - Gcal API also doesn't provide access to existing watches
  */
  async saveWatchInfo(
    userId: string,
    calendarId: string,
    channelId: string,
    resourceId: string
  ) {
    logger.debug("Saving watch info");
    const watchInfo = { userId, calendarId, channelId, resourceId };
    const saveRes = await mongoService.db
      .collection(Collections.DEV_WATCHLOG_GCAL)
      .insertOne(watchInfo);

    if (saveRes.acknowledged) {
      return "success";
    } else {
      logger.error("Failed to save watch info");
      logger.error(saveRes);
      return "failed";
    }
  }

  async stopAllChannelWatches(userId: string) {
    logger.info(`Stopping all watches for user: ${userId}`);
    const allWatches = await mongoService.db
      .collection(Collections.DEV_WATCHLOG_GCAL)
      .find({ userId: userId })
      .toArray();

    let summary = [];
    for (let w of allWatches) {
      const stopResult: Result_Stop_Watch =
        await syncService.stopWatchingChannel(
          userId,
          w.channelId,
          w.resourceId
        );
      summary.push(
        `${stopResult.stopWatching.channelId}: ${stopResult.deleteForDev}`
      );
    }
    return summary;
  }
}

export default new DevService();
