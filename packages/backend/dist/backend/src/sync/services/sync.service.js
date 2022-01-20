"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const date_utils_1 = require("@core/util/date.utils");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const google_auth_service_1 = require("@backend/auth/services/google.auth.service");
const common_logger_1 = require("@backend/common/logger/common.logger");
const backend_constants_1 = require("@backend/common/constants/backend.constants");
const collections_1 = require("@backend/common/constants/collections");
const gcal_service_1 = __importDefault(require("@backend/common/services/gcal/gcal.service"));
const mongo_service_1 = __importDefault(require("@backend/common/services/mongo.service"));
const sync_helpers_1 = require("./sync.helpers");
const logger = common_logger_1.Logger("app:sync.service");
class SyncService {
    constructor() {
        this.prepareSyncChannels = (reqParams) => __awaiter(this, void 0, void 0, function* () {
            const channelPrepResult = {
                stop: undefined,
                refresh: undefined,
                stillActive: undefined,
            };
            // initialize what you'll need later
            const calendarList = yield mongo_service_1.default.db
                .collection(collections_1.Collections.CALENDARLIST)
                .findOne({ "google.items.sync.resourceId": reqParams.resourceId });
            const userId = calendarList.user;
            const cal = sync_helpers_1.findCalendarByResourceId(reqParams.resourceId, calendarList);
            const nextSyncToken = cal.sync.nextSyncToken;
            const gcal = yield google_auth_service_1.getGcal(userId);
            const refreshNeeded = sync_helpers_1.channelRefreshNeeded(reqParams, calendarList);
            if (refreshNeeded) {
                channelPrepResult.refresh = yield this.refreshChannelWatch(userId, gcal, reqParams);
            }
            else {
                channelPrepResult.stillActive = true;
            }
            return { channelPrepResult, userId, gcal, nextSyncToken };
        });
        this.refreshChannelWatch = (userId, gcal, reqParams) => __awaiter(this, void 0, void 0, function* () {
            const stopResult = yield this.stopWatchingChannel(userId, reqParams.channelId, reqParams.resourceId);
            // create new channelId to prevent `channelIdNotUnique` google api error
            const newChannelId = `pri-rfrshd${uuid_1.v4()}`;
            const startResult = yield this.startWatchingChannel(gcal, backend_constants_1.GCAL_PRIMARY, newChannelId);
            const syncUpdate = yield sync_helpers_1.updateSyncData(userId, newChannelId, reqParams.resourceId, reqParams.expiration);
            const refreshResult = {
                stop: stopResult,
                start: startResult,
                syncUpdate: syncUpdate.ok === 1 ? "success" : "failed",
            };
            return refreshResult;
        });
    }
    handleGcalNotification(reqParams) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = {
                    params: undefined,
                    init: undefined,
                    watch: undefined,
                    events: undefined,
                };
                if (reqParams.resourceState === "sync") {
                    const resourceIdResult = yield sync_helpers_1.updateResourceId(reqParams.channelId, reqParams.resourceId);
                    if (resourceIdResult.ok === 1) {
                        result.init = `A new notification channel was successfully created for: channelId '${reqParams.channelId}' resourceId: '${reqParams.resourceId}'`;
                    }
                    else {
                        result.init = {
                            "Something failed while setting the resourceId:": resourceIdResult,
                        };
                    }
                }
                // There is new data to sync from GCal //
                else if (reqParams.resourceState === "exists") {
                    const { channelPrepResult, userId, gcal, nextSyncToken } = yield this.prepareSyncChannels(reqParams);
                    result.watch = channelPrepResult;
                    const params = Object.assign(Object.assign({}, reqParams), { userId: userId, nextSyncToken: nextSyncToken, calendarId: `${backend_constants_1.GCAL_NOTIFICATION_URL} <- hard-coded for now` });
                    result.params = params;
                    result.events = yield _syncUpdates(gcal, params);
                }
                logger.debug(JSON.stringify(result, null, 2));
                return result;
            }
            catch (e) {
                logger.error(e);
                return new errors_base_1.BaseError("Sync Failed", e, status_codes_1.Status.INTERNAL_SERVER, false);
            }
        });
    }
    /*
    Setup the notification channel for a user's calendar,
    telling google where to notify us when an event changes
    */
    startWatchingChannel(gcal, calendarId, channelId) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`Setting up watch for calendarId: '${calendarId}' and channelId: '${channelId}'`);
            try {
                // const numMin = 120;
                // console.log(
                // `\n**REMINDER: channel is expiring in just ${numMin} mins. Change before deploying**\n`
                // );
                // const expiration = minutesFromNow(numMin, "ms").toString();
                const expiration = date_utils_1.daysFromNowTimestamp(1, "ms").toString();
                console.log(`\n**REMINDER: channel is expiring in just 1 (?) day. Change before deploying to lots of ppl**\n`);
                // const expiration = daysFromNowTimestamp(21, "ms").toString();
                const response = yield gcal.events.watch({
                    calendarId: calendarId,
                    requestBody: {
                        id: channelId,
                        //address always needs to be HTTPS, so use prod url
                        address: `${process.env.BASEURL_PROD}${backend_constants_1.GCAL_NOTIFICATION_URL}`,
                        type: "web_hook",
                        expiration: expiration,
                    },
                });
                return response.data;
            }
            catch (e) {
                if (e.code && e.code === 400) {
                    throw new errors_base_1.BaseError("Start Watch Failed", e.errors, status_codes_1.Status.BAD_REQUEST, false);
                }
                else {
                    logger.error(e);
                    throw new errors_base_1.BaseError("Start Watch Failed", e.toString(), status_codes_1.Status.INTERNAL_SERVER, false);
                }
            }
        });
    }
    stopWatchingChannel(userId, channelId, resourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug(`Stopping watch for channelId: ${channelId} and resourceId: ${resourceId}`);
            try {
                const gcal = yield google_auth_service_1.getGcal(userId);
                const params = {
                    requestBody: {
                        id: channelId,
                        resourceId: resourceId,
                    },
                };
                const stopResult = yield gcal.channels.stop(params);
                if (stopResult.status === 204) {
                    return {
                        stopWatching: {
                            result: "success",
                            channelId: channelId,
                            resourceId: resourceId,
                        },
                    };
                }
                return { stopWatching: stopResult };
            }
            catch (e) {
                if (e.code && e.code === 404) {
                    return new errors_base_1.BaseError("Stop Watch Failed", e.message, status_codes_1.Status.NOT_FOUND, false);
                }
                logger.error(e);
                return new errors_base_1.BaseError("Stop Watch Failed", e, status_codes_1.Status.INTERNAL_SERVER, false);
            }
        });
    }
}
exports.default = new SyncService();
/*************************************************************/
/*  Internal Helpers
      These have too many dependencies to go in sync.helpers,
      which makes testing harder. So, keep here for now */
/*************************************************************/
const _syncUpdates = (gcal, params) => __awaiter(void 0, void 0, void 0, function* () {
    const syncResult = {
        syncToken: undefined,
        result: undefined,
    };
    try {
        // Fetch the changes to events //
        // TODO: handle pageToken in case a lot of new events changed
        logger.debug("Fetching updated gcal events");
        const updatedEvents = yield gcal_service_1.default.getEvents(gcal, {
            // TODO use calendarId once supporting non-'primary' calendars
            // calendarId: params.calendarId,
            calendarId: backend_constants_1.GCAL_PRIMARY,
            syncToken: params.nextSyncToken,
        });
        // Save the updated sync token for next time
        // Should you do this even if no update found;?
        // could potentially do this without awaiting to speed up
        const syncTokenUpdateResult = yield sync_helpers_1.updateNextSyncToken(params.userId, updatedEvents.data.nextSyncToken);
        syncResult.syncToken = syncTokenUpdateResult;
        if (updatedEvents.data.items.length === 0) {
            return new errors_base_1.BaseError("No updates found", "Not sure if this is normal or not", status_codes_1.Status.NOT_FOUND, true);
        }
        logger.debug(`Found ${updatedEvents.data.items.length} events to update`);
        // Update Compass' DB
        const { eventsToDelete, eventsToUpdate } = sync_helpers_1.categorizeGcalEvents(updatedEvents.data.items);
        const bulkOperations = sync_helpers_1.assembleBulkOperations(params.userId, eventsToDelete, eventsToUpdate);
        syncResult.result = yield mongo_service_1.default.db
            .collection(collections_1.Collections.EVENT)
            .bulkWrite(bulkOperations);
        return syncResult;
    }
    catch (e) {
        logger.error(`Errow while sycning\n`, e);
        return new errors_base_1.BaseError("Sync Update Failed", e, status_codes_1.Status.INTERNAL_SERVER, true);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luYy5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3N5bmMvc2VydmljZXMvc3luYy5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQW9DO0FBSXBDLHNEQUE2RTtBQU83RSwwREFBcUQ7QUFDckQsNERBQW1EO0FBRW5ELG9GQUFxRTtBQUNyRSx3RUFBOEQ7QUFDOUQsbUZBR3FEO0FBQ3JELHVFQUFvRTtBQUNwRSw4RkFBcUU7QUFDckUsMkZBQWtFO0FBRWxFLGlEQVF3QjtBQUV4QixNQUFNLE1BQU0sR0FBRyxzQkFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFFMUMsTUFBTSxXQUFXO0lBQWpCO1FBOEpFLHdCQUFtQixHQUFHLENBQU8sU0FBNEIsRUFBRSxFQUFFO1lBQzNELE1BQU0saUJBQWlCLEdBQUc7Z0JBQ3hCLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxTQUFTO2dCQUNsQixXQUFXLEVBQUUsU0FBUzthQUN2QixDQUFDO1lBRUYsb0NBQW9DO1lBQ3BDLE1BQU0sWUFBWSxHQUF3QixNQUFNLHVCQUFZLENBQUMsRUFBRTtpQkFDNUQsVUFBVSxDQUFDLHlCQUFXLENBQUMsWUFBWSxDQUFDO2lCQUNwQyxPQUFPLENBQUMsRUFBRSw4QkFBOEIsRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUVyRSxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDO1lBRWpDLE1BQU0sR0FBRyxHQUFHLHVDQUF3QixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDekUsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7WUFFN0MsTUFBTSxJQUFJLEdBQUcsTUFBTSw2QkFBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRW5DLE1BQU0sYUFBYSxHQUFHLG1DQUFv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