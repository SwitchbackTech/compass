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
exports.updateSyncData = exports.updateResourceId = exports.findCalendarByResourceId = exports.updateNextSyncToken = exports.channelRefreshNeeded = exports.channelExpiresSoon = exports.channelNotFound = exports.categorizeGcalEvents = exports.assembleBulkOperations = void 0;
const map_event_1 = require("@core/mappers/map.event");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const date_utils_1 = require("@core/util/date.utils");
const common_logger_1 = require("@backend/common/logger/common.logger");
//TODO decouple mongo from this helper file, cuz its causing
// an open handle during jest runs
const mongo_service_1 = __importDefault(require("@backend/common/services/mongo.service"));
const gcal_helpers_1 = require("@backend/common/services/gcal/gcal.helpers");
const collections_1 = require("@backend/common/constants/collections");
const logger = common_logger_1.Logger("app:sync.helpers");
const assembleBulkOperations = (userId, eventsToDelete, eventsToUpdate) => {
    const bulkOperations = [];
    if (eventsToDelete.length > 0) {
        bulkOperations.push({
            deleteMany: {
                filter: {
                    user: userId,
                    gEventId: { $in: eventsToDelete },
                },
            },
        });
    }
    if (eventsToUpdate.length > 0) {
        const cEvents = map_event_1.MapEvent.toCompass(userId, eventsToUpdate);
        cEvents.forEach((e) => {
            bulkOperations.push({
                updateOne: {
                    filter: { gEventId: e.gEventId, user: userId },
                    update: { $set: e },
                    upsert: true,
                },
            });
        });
    }
    return bulkOperations;
};
exports.assembleBulkOperations = assembleBulkOperations;
const categorizeGcalEvents = (events) => {
    const toDelete = gcal_helpers_1.cancelledEventsIds(events);
    // assume that everything that shouldnt be deleted
    // should be updated
    const toUpdate = events.filter((e) => !toDelete.includes(e.id));
    const categorized = {
        eventsToDelete: toDelete,
        eventsToUpdate: toUpdate,
    };
    return categorized;
};
exports.categorizeGcalEvents = categorizeGcalEvents;
/*
The channelId should also be found, but this is a sanity-check
in case something unexpected happened
*/
const channelNotFound = (calendar, channelId) => {
    const matchingChannelIds = calendar.google.items.filter((c) => c.sync.channelId === channelId);
    if (matchingChannelIds.length != 1) {
        return true;
    }
    else {
        // if exactly 1 entry, then the correct channel was found
        return false;
    }
};
exports.channelNotFound = channelNotFound;
const channelExpiresSoon = (expiry) => {
    // Temp: testing sync
    const xMinFromNow = date_utils_1.minutesFromNow(30, "ms");
    const expiration = new Date(expiry).getTime();
    const channelExpiresSoon = expiration < xMinFromNow;
    // TODO re-enable
    // const xDaysFromNow = daysFromNowTimestamp(3, "ms");
    // const expiration = new Date(expiry).getTime();
    // const channelExpiresSoon = expiration < xDaysFromNow;
    return channelExpiresSoon;
};
exports.channelExpiresSoon = channelExpiresSoon;
const channelRefreshNeeded = (reqParams, calendar) => {
    //todo test if any channelIds in items match
    const _channelNotFound = exports.channelNotFound(calendar, reqParams.channelId);
    const _channelExpiresSoon = exports.channelExpiresSoon(reqParams.expiration);
    const refreshNeeded = _channelNotFound || _channelExpiresSoon;
    if (refreshNeeded) {
        logger.debug(`Refresh needed because:
        Channel expired? : ${_channelNotFound.toString()}
        Channel expiring soon? : ${_channelExpiresSoon.toString()}`);
    }
    return refreshNeeded;
};
exports.channelRefreshNeeded = channelRefreshNeeded;
const updateNextSyncToken = (userId, nextSyncToken) => __awaiter(void 0, void 0, void 0, function* () {
    logger.debug(`Updating nextSyncToken to: ${nextSyncToken}`);
    const msg = `Failed to update the nextSyncToken for calendar record of user: ${userId}`;
    const err = new errors_base_1.BaseError("Update Failed", msg, 500, true);
    try {
        // updates the primary calendar's nextSyncToken
        // query will need to be updated once supporting non-primary calendars
        const result = yield mongo_service_1.default.db
            .collection(collections_1.Collections.CALENDARLIST)
            .findOneAndUpdate({ user: userId, "google.items.primary": true }, {
            $set: {
                "google.items.$.sync.nextSyncToken": nextSyncToken,
                updatedAt: new Date().toISOString(),
            },
        }, { returnDocument: "after" });
        if (result.value !== null) {
            return { status: `updated to: ${nextSyncToken}` };
        }
        else {
            logger.error(msg);
            return { status: "Failed to update properly", debugResult: result };
        }
    }
    catch (e) {
        logger.error(e);
        throw err;
    }
});
exports.updateNextSyncToken = updateNextSyncToken;
const findCalendarByResourceId = (
//todo loop through items.sync for the one that matches the resourceId,
// then grab that one's nextSyncToken
resourceId, calendarList) => {
    const matches = calendarList.google.items.filter((g) => {
        return g.sync.resourceId === resourceId;
    });
    if (matches.length !== 1) {
        logger.error(`No calendar has resourceId: ${resourceId}`);
    }
    if (matches.length > 1) {
        throw new errors_base_1.BaseError("Duplicate resourceIds", `Multiple calendars share resourceId: ${resourceId}`, status_codes_1.Status.BAD_REQUEST, false);
    }
    return matches[0];
};
exports.findCalendarByResourceId = findCalendarByResourceId;
const updateResourceId = (channelId, resourceId) => __awaiter(void 0, void 0, void 0, function* () {
    logger.debug(`Updating resourceId to: ${resourceId}`);
    const result = yield mongo_service_1.default.db
        .collection(collections_1.Collections.CALENDARLIST)
        .findOneAndUpdate({ "google.items.sync.channelId": channelId }, {
        $set: {
            "google.items.$.sync.resourceId": resourceId,
            updatedAt: new Date().toISOString(),
        },
    });
    return result;
});
exports.updateResourceId = updateResourceId;
const updateSyncData = (userId, channelId, resourceId, expiration) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield mongo_service_1.default.db
        .collection(collections_1.Collections.CALENDARLIST)
        .findOneAndUpdate(
    // TODO update after supporting more calendars
    { user: userId, "google.items.primary": true }, {
        $set: {
            "google.items.$.sync.channelId": channelId,
            "google.items.$.sync.resourceId": resourceId,
            "google.items.$.sync.expiration": expiration,
        },
    });
    return result;
});
exports.updateSyncData = updateSyncData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luYy5oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3N5bmMvc2VydmljZXMvc3luYy5oZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUdBLHVEQUFtRDtBQUNuRCwwREFBcUQ7QUFDckQsNERBQW1EO0FBQ25ELHNEQUF1RDtBQU12RCx3RUFBOEQ7QUFFOUQsNERBQTREO0FBQzVELGtDQUFrQztBQUNsQywyRkFBa0U7QUFDbEUsNkVBQWdGO0FBQ2hGLHVFQUFvRTtBQUVwRSxNQUFNLE1BQU0sR0FBRyxzQkFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFFbkMsTUFBTSxzQkFBc0IsR0FBRyxDQUNwQyxNQUFjLEVBQ2QsY0FBd0IsRUFDeEIsY0FBK0IsRUFDL0IsRUFBRTtJQUNGLE1BQU0sY0FBYyxHQUE0QixFQUFFLENBQUM7SUFFbkQsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUM3QixjQUFjLENBQUMsSUFBSSxDQUFDO1lBQ2xCLFVBQVUsRUFBRTtnQkFDVixNQUFNLEVBQUU7b0JBQ04sSUFBSSxFQUFFLE1BQU07b0JBQ1osUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRTtpQkFDbEM7YUFDRjtTQUNGLENBQUMsQ0FBQztLQUNKO0lBRUQsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUM3QixNQUFNLE9BQU8sR0FBRyxvQkFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFM0QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQWUsRUFBRSxFQUFFO1lBQ2xDLGNBQWMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xCLFNBQVMsRUFBRTtvQkFDVCxNQUFNLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO29CQUM5QyxN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