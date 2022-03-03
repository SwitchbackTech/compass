"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
//@ts-nocheck
const uuid_1 = require("uuid");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const google_auth_service_1 = require("@backend/auth/services/google.auth.service");
const winston_logger_1 = require("@core/logger/winston.logger");
const backend_constants_1 = require("@backend/common/constants/backend.constants");
const collections_1 = require("@backend/common/constants/collections");
const common_helpers_1 = require("@backend/common/helpers/common.helpers");
const gcal_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/gcal/gcal.service")
);
const mongo_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/mongo.service")
);
const dev_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/dev/services/dev.service")
);
const sync_helpers_1 = require("./sync.helpers");
const logger = (0, winston_logger_1.Logger)("app:sync.service");
class SyncService {
  constructor() {
    this.prepareSyncChannels = (reqParams) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const channelPrepResult = {
          stop: undefined,
          refresh: undefined,
          stillActive: undefined,
        };
        // initialize what you'll need later
        const calendarList = yield mongo_service_1.default.db
          .collection(collections_1.Collections.CALENDARLIST)
          .findOne({
            "google.items.sync.resourceId": reqParams.resourceId,
          });
        const userId = calendarList.user;
        const cal = (0, sync_helpers_1.findCalendarByResourceId)(
          reqParams.resourceId,
          calendarList
        );
        const nextSyncToken = cal.sync.nextSyncToken;
        const gcal = yield (0, google_auth_service_1.getGcal)(userId);
        const refreshNeeded = (0, sync_helpers_1.channelRefreshNeeded)(
          reqParams,
          calendarList
        );
        if (refreshNeeded) {
          channelPrepResult.refresh = yield this.refreshChannelWatch(
            userId,
            gcal,
            reqParams
          );
        } else {
          channelPrepResult.stillActive = true;
        }
        return { channelPrepResult, userId, gcal, nextSyncToken };
      });
    this.prepareUpdate = (gcal, params) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const prepResult = {
          syncToken: undefined,
          operations: undefined,
          errors: [],
        };
        try {
          // TODO: support pageToken in case a lot of new events changed since last sync
          const updatedEvents = yield gcal_service_1.default.getEvents(gcal, {
            calendarId: params.calendarId,
            syncToken: params.nextSyncToken,
          });
          // Save the updated sync token for next time
          const syncTokenUpdateResult = yield this.updateNextSyncToken(
            params.userId,
            updatedEvents.data.nextSyncToken
          );
          prepResult.syncToken = syncTokenUpdateResult;
          // Update Compass' DB
          const { eventsToDelete, eventsToUpdate } = (0,
          sync_helpers_1.categorizeGcalEvents)(updatedEvents.data.items);
          logger.debug(
            `Events to update: ${eventsToUpdate.length}  |  Events to delete: ${eventsToDelete.length}`
          );
          prepResult.operations = (0, sync_helpers_1.assembleBulkOperations)(
            params.userId,
            eventsToDelete,
            eventsToUpdate
          );
          return prepResult;
        } catch (e) {
          logger.error(`Errow while sycning\n`, e);
          const err = new errors_base_1.BaseError(
            "Sync Update Failed",
            e,
            status_codes_1.Status.INTERNAL_SERVER,
            true
          );
          prepResult.errors.push(err);
          return prepResult;
        }
      });
    this.refreshChannelWatch = (userId, gcal, reqParams) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const stopResult = yield this.stopWatchingChannel(
          userId,
          reqParams.channelId,
          reqParams.resourceId
        );
        // create new channelId to prevent `channelIdNotUnique` google api error
        const newChannelId = `pri-rfrshd${(0, uuid_1.v4)()}`;
        const startResult = yield this.startWatchingChannel(
          gcal,
          userId,
          backend_constants_1.GCAL_PRIMARY,
          newChannelId
        );
        const syncUpdate = yield this.updateSyncData(
          userId,
          newChannelId,
          reqParams.resourceId,
          reqParams.expiration
        );
        const refreshResult = {
          stop: stopResult,
          start: startResult,
          syncUpdate: syncUpdate.ok === 1 ? "success" : "failed",
        };
        return refreshResult;
      });
    this.updateNextSyncToken = (userId, nextSyncToken) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        logger.debug(`Updating nextSyncToken to: ${nextSyncToken}`);
        const msg = `Failed to update the nextSyncToken for calendar record of user: ${userId}`;
        const err = new errors_base_1.BaseError(
          "Update Failed",
          msg,
          500,
          true
        );
        try {
          // updates the primary calendar's nextSyncToken
          // query will need to be updated once supporting non-primary calendars
          const result = yield mongo_service_1.default.db
            .collection(collections_1.Collections.CALENDARLIST)
            .findOneAndUpdate(
              { user: userId, "google.items.primary": true },
              {
                $set: {
                  "google.items.$.sync.nextSyncToken": nextSyncToken,
                  updatedAt: new Date().toISOString(),
                },
              },
              { returnDocument: "after" }
            );
          if (result.value !== null) {
            return { status: `updated to: ${nextSyncToken}` };
          } else {
            logger.error(msg);
            return { status: "Failed to update properly", debugResult: result };
          }
        } catch (e) {
          logger.error(e);
          throw err;
        }
      });
    this.updateResourceId = (channelId, resourceId) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        logger.debug(`Updating resourceId to: ${resourceId}`);
        const result = yield mongo_service_1.default.db
          .collection(collections_1.Collections.CALENDARLIST)
          .findOneAndUpdate(
            { "google.items.sync.channelId": channelId },
            {
              $set: {
                "google.items.$.sync.resourceId": resourceId,
                updatedAt: new Date().toISOString(),
              },
            }
          );
        return result;
      });
    this.updateSyncData = (userId, channelId, resourceId, expiration) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const result = yield mongo_service_1.default.db
          .collection(collections_1.Collections.CALENDARLIST)
          .findOneAndUpdate(
            // TODO update after supporting more calendars
            { user: userId, "google.items.primary": true },
            {
              $set: {
                "google.items.$.sync.channelId": channelId,
                "google.items.$.sync.resourceId": resourceId,
                "google.items.$.sync.expiration": expiration,
              },
            }
          );
        return result;
      });
  }
  handleGcalNotification(reqParams) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        const result = {
          params: undefined,
          init: undefined,
          watch: undefined,
          prep: undefined,
          events: undefined,
        };
        if (reqParams.resourceState === "sync") {
          const resourceIdResult = yield this.updateResourceId(
            reqParams.channelId,
            reqParams.resourceId
          );
          if (resourceIdResult.ok === 1) {
            result.init = `A new notification channel was successfully created for: channelId '${reqParams.channelId}' resourceId: '${reqParams.resourceId}'`;
          } else {
            result.init = {
              "Something failed while setting the resourceId:":
                resourceIdResult,
            };
          }
        }
        // There is new data to sync from GCal //
        else if (reqParams.resourceState === "exists") {
          const { channelPrepResult, userId, gcal, nextSyncToken } =
            yield this.prepareSyncChannels(reqParams);
          result.watch = channelPrepResult;
          const params = Object.assign(Object.assign({}, reqParams), {
            userId: userId,
            nextSyncToken: nextSyncToken,
            // TODO use non-hard-coded calendarId once supporting non-'primary' calendars
            calendarId: backend_constants_1.GCAL_PRIMARY,
          });
          result.params = params;
          const prepResult = yield this.prepareUpdate(gcal, params);
          result.prep = prepResult;
          if (prepResult.operations.length > 0)
            result.events = yield mongo_service_1.default.db
              .collection(collections_1.Collections.EVENT)
              .bulkWrite(prepResult.operations);
        }
        logger.debug(JSON.stringify(result, null, 2));
        return result;
      } catch (e) {
        logger.error(e);
        return new errors_base_1.BaseError(
          "Sync Failed",
          e,
          status_codes_1.Status.INTERNAL_SERVER,
          false
        );
      }
    });
  }
  /*
    Setup the notification channel for a user's calendar,
    telling google where to notify us when an event changes
    */
  startWatchingChannel(gcal, userId, calendarId, channelId) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      logger.info(
        `Setting up watch for calendarId: '${calendarId}' and channelId: '${channelId}'`
      );
      try {
        const _expiration = (0, sync_helpers_1.getChannelExpiration)();
        const response = yield gcal.events.watch({
          calendarId: calendarId,
          requestBody: {
            id: channelId,
            // address always needs to be HTTPS, so use prod url
            address: `${process.env.BASEURL_PROD}${backend_constants_1.GCAL_NOTIFICATION_URL}`,
            type: "web_hook",
            expiration: _expiration,
          },
        });
        if (response.data && (0, common_helpers_1.isDev)()) {
          const saveWatchInfoRes = yield dev_service_1.default.saveWatchInfo(
            userId,
            calendarId,
            channelId,
            response.data.resourceId
          );
          return { channel: response.data, saveForDev: saveWatchInfoRes };
        }
        return { channel: response.data };
      } catch (e) {
        if (e.code && e.code === 400) {
          throw new errors_base_1.BaseError(
            "Start Watch Failed",
            e.errors,
            status_codes_1.Status.BAD_REQUEST,
            false
          );
        } else {
          logger.error(e);
          throw new errors_base_1.BaseError(
            "Start Watch Failed",
            e.toString(),
            status_codes_1.Status.INTERNAL_SERVER,
            false
          );
        }
      }
    });
  }
  stopWatchingChannel(userId, channelId, resourceId) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      logger.debug(
        `Stopping watch for channelId: ${channelId} and resourceId: ${resourceId}`
      );
      try {
        const gcal = yield (0, google_auth_service_1.getGcal)(userId);
        const params = {
          requestBody: {
            id: channelId,
            resourceId: resourceId,
          },
        };
        const stopResult = yield gcal.channels.stop(params);
        if (stopResult.status === 204) {
          const stopWatchSummary = {
            result: "success",
            channelId: channelId,
            resourceId: resourceId,
          };
          if ((0, common_helpers_1.isDev)()) {
            const deleteForDev = yield dev_service_1.default.deleteWatchInfo(
              userId,
              channelId,
              resourceId
            );
            return { stopWatching: stopWatchSummary, deleteForDev };
          } else {
            return { stopWatching: stopWatchSummary };
          }
        }
        logger.warn("Stop Watch failed for unexpected reason");
        return { stopWatching: { result: "failed", debug: stopResult } };
      } catch (e) {
        if (e.code && e.code === 404) {
          return new errors_base_1.BaseError(
            "Stop Watch Failed",
            e.message,
            status_codes_1.Status.NOT_FOUND,
            false
          );
        }
        logger.error(e);
        return new errors_base_1.BaseError(
          "Stop Watch Failed",
          e,
          status_codes_1.Status.INTERNAL_SERVER,
          false
        );
      }
    });
  }
}
exports.default = new SyncService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luYy5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvc3luYy9zZXJ2aWNlcy9zeW5jLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsYUFBYTtBQUNiLCtCQUFvQztBQVdwQywwREFBcUQ7QUFDckQsNERBQW1EO0FBQ25ELG9GQUFxRTtBQUNyRSxnRUFBcUQ7QUFDckQsbUZBR3FEO0FBQ3JELHVFQUFvRTtBQUNwRSwyRUFBK0Q7QUFDL0QsMkdBQXFFO0FBQ3JFLHdHQUFrRTtBQUNsRSxpR0FBMkQ7QUFFM0QsaURBTXdCO0FBRXhCLE1BQU0sTUFBTSxHQUFHLElBQUEsdUJBQU0sRUFBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBRTFDLE1BQU0sV0FBVztJQUFqQjtRQWtMRSx3QkFBbUIsR0FBRyxDQUFPLFNBQTRCLEVBQUUsRUFBRTtZQUMzRCxNQUFNLGlCQUFpQixHQUFHO2dCQUN4QixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsU0FBUztnQkFDbEIsV0FBVyxFQUFFLFNBQVM7YUFDdkIsQ0FBQztZQUVGLG9DQUFvQztZQUNwQyxNQUFNLFlBQVksR0FBRyxDQUFDLE1BQU0sdUJBQVksQ0FBQyxFQUFFO2lCQUN4QyxVQUFVLENBQUMseUJBQVcsQ0FBQyxZQUFZLENBQUM7aUJBQ3BDLE9BQU8sQ0FBQztnQkFDUCw4QkFBOEIsRUFBRSxTQUFTLENBQUMsVUFBVTthQUNyRCxDQUFDLENBQXdCLENBQUM7WUFFN0IsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztZQUVqQyxNQUFNLEdBQUcsR0FBRyxJQUFBLHVDQUF3QixFQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDekUsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7WUFFN0MsTUFBTSxJQUFJLEdBQUcsTUFBTSxJ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
