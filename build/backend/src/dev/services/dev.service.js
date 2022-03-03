"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const winston_logger_1 = require("@core/logger/winston.logger");
const collections_1 = require("@backend/common/constants/collections");
const mongo_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/mongo.service")
);
const sync_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/sync/services/sync.service")
);
const logger = (0, winston_logger_1.Logger)("app:sync.service");
/* Sync functions that are meant for development only */
class DevService {
  deleteWatchInfo(userId, channelId, resourceId) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      const delWatchInfo = yield mongo_service_1.default.db
        .collection(collections_1.Collections.DEV_WATCHLOG_GCAL)
        .deleteOne({ userId, channelId, resourceId });
      const deleteForDev = delWatchInfo.acknowledged ? "success" : "failed";
      return deleteForDev;
    });
  }
  /*
    Saving every watch request and associating it with a user helps development,
    by allowing a script to stop every existing channel watch for user X
      - This isn't possible using the calendarlist collection, since only the latest
        watch info is saved there
      - Gcal API also doesn't provide access to existing watches
    */
  saveWatchInfo(userId, calendarId, channelId, resourceId) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      logger.debug("Saving watch info");
      const watchInfo = { userId, calendarId, channelId, resourceId };
      const saveRes = yield mongo_service_1.default.db
        .collection(collections_1.Collections.DEV_WATCHLOG_GCAL)
        .insertOne(watchInfo);
      if (saveRes.acknowledged) {
        return "success";
      } else {
        logger.error("Failed to save watch info");
        logger.error(saveRes);
        return "failed";
      }
    });
  }
  stopAllChannelWatches(userId) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        logger.info(`Stopping all watches for user: ${userId}`);
        const allWatches = yield mongo_service_1.default.db
          .collection(collections_1.Collections.DEV_WATCHLOG_GCAL)
          .find({ userId: userId })
          .toArray();
        const summary = [];
        for (const w of allWatches) {
          const stopResult = yield sync_service_1.default.stopWatchingChannel(
            userId,
            w.channelId,
            w.resourceId
          );
          if ("statusCode" in stopResult) {
            // then it failed
            // TODO this assumes it failed cuz of 404 not found,
            // make more dynamic
            const filter = { userId, channelId: w.channelId };
            const delRes = yield mongo_service_1.default.db
              .collection(collections_1.Collections.DEV_WATCHLOG_GCAL)
              .deleteOne(filter);
            const dr = delRes.acknowledged ? "pruned" : "prune failed";
            summary.push(`${w.channelId}: ${dr}`);
          } else {
            summary.push(
              `${stopResult.stopWatching.channelId}: ${stopResult.deleteForDev}`
            );
          }
        }
        return summary;
      } catch (e) {
        console.log(e);
      }
    });
  }
}
exports.default = new DevService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2LnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9iYWNrZW5kL3NyYy9kZXYvc2VydmljZXMvZGV2LnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsZ0VBQXFEO0FBQ3JELHVFQUFvRTtBQUNwRSx3R0FBa0U7QUFDbEUsb0dBQThEO0FBRTlELE1BQU0sTUFBTSxHQUFHLElBQUEsdUJBQU0sRUFBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBRTFDLHdEQUF3RDtBQUV4RCxNQUFNLFVBQVU7SUFDUixlQUFlLENBQUMsTUFBYyxFQUFFLFNBQWlCLEVBQUUsVUFBa0I7O1lBQ3pFLE1BQU0sWUFBWSxHQUFHLE1BQU0sdUJBQVksQ0FBQyxFQUFFO2lCQUN2QyxVQUFVLENBQUMseUJBQVcsQ0FBQyxpQkFBaUIsQ0FBQztpQkFDekMsU0FBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBRWhELE1BQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQ3RFLE9BQU8sWUFBWSxDQUFDO1FBQ3RCLENBQUM7S0FBQTtJQUVEOzs7Ozs7TUFNRTtJQUNJLGFBQWEsQ0FDakIsTUFBYyxFQUNkLFVBQWtCLEVBQ2xCLFNBQWlCLEVBQ2pCLFVBQWtCOztZQUVsQixNQUFNLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDbEMsTUFBTSxTQUFTLEdBQUcsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQztZQUNoRSxNQUFNLE9BQU8sR0FBRyxNQUFNLHVCQUFZLENBQUMsRUFBRTtpQkFDbEMsVUFBVSxDQUFDLHlCQUFXLENBQUMsaUJBQWlCLENBQUM7aUJBQ3pDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV4QixJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUU7Z0JBQ3hCLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO2lCQUFNO2dCQUNMLE1BQU0sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDdEIsT0FBTyxRQUFRLENBQUM7YUFDakI7UUFDSCxDQUFDO0tBQUE7SUFFSyxxQkFBcUIsQ0FBQyxNQUFjOztZQUN4QyxJQUFJO2dCQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ3hELE1BQU0sVUFBVSxHQUFHLE1BQU0sdUJBQVksQ0FBQyxFQUFFO3FCQUNyQyxVQUFVLENBQUMseUJBQVcsQ0FBQyxpQkFBaUIsQ0FBQztxQkFDekMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDO3FCQUN4QixPQUFPLEVBQUUsQ0FBQztnQkFFYixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ25CLEtBQUssTUFBTSxDQUFDLElBQUksVUFBVSxFQUFFO29CQUMxQixNQUFNLFVBQVUsR0FDZCxNQUFNLHNCQUFXLENBQUMsbUJBQW1CLENBQ25DLE1BQU0sRUFDTixDQUFDLENBQUMsU0FBUyxFQUNYLENBQUMsQ0FBQyxVQUFVLENBQ2IsQ0FBQztvQkFDSixJQUFJLFlBQVksSUFBSSxVQUFVLEVBQUU7d0JBQzlCLGlCQUFpQjt3QkFDakIsb0RBQW9EO3dCQUNwRCxvQkFBb0I7d0JBQ3BCLE1BQU0sTUFBTSxHQUFHLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ2xELE1BQU0sTUFBTSxHQUFHLE1BQU0sdUJBQVksQ0FBQyxFQUFFOzZCQUNqQyxVQUFVLENBQUMseUJBQVcsQ0FBQyxpQkFBaUIsQ0FBQzs2QkFDekMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUNyQixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQzt3QkFDM0QsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztxQkFDdkM7eUJBQU07d0JBQ0wsT0FBTyxDQUFDLElBQUksQ0FDVixHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsU0FBUyxLQUFLLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FDbkUsQ0FBQztxQkFDSDtpQkFDRjtnQkFDRCxPQUFPLE9BQU8sQ0FBQzthQUNoQjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDaEI7UUFDSCxDQUFDO0tBQUE7Q0FDRjtBQUVELGtCQUFlLElBQUksVUFBVSxFQUFFLENBQUMifQ==
