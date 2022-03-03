"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasExpectedHeaders =
  exports.getChannelExpiration =
  exports.findCalendarByResourceId =
  exports.channelRefreshNeeded =
  exports.channelNotFound =
  exports.channelExpiresSoon =
  exports.categorizeGcalEvents =
  exports.assembleBulkOperations =
    void 0;
const map_event_1 = require("@core/mappers/map.event");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const date_utils_1 = require("@core/util/date.utils");
const date_utils_2 = require("@core/util/date.utils");
const core_constants_1 = require("@core/core.constants");
const winston_logger_1 = require("@core/logger/winston.logger");
const gcal_helpers_1 = require("@backend/common/services/gcal/gcal.helpers");
const common_helpers_1 = require("@backend/common/helpers/common.helpers");
const logger = (0, winston_logger_1.Logger)("app:sync.helpers");
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
    const cEvents = map_event_1.MapEvent.toCompass(
      userId,
      eventsToUpdate,
      core_constants_1.Origin.Google
    );
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
  const toDelete = (0, gcal_helpers_1.cancelledEventsIds)(events);
  // if its going to be deleted anyway, then dont bother updating
  const _isntBeingDeleted = (e) => !toDelete.includes(e.id);
  const toUpdate = events.filter((e) => _isntBeingDeleted(e));
  const categorized = {
    eventsToDelete: toDelete,
    eventsToUpdate: toUpdate,
  };
  return categorized;
};
exports.categorizeGcalEvents = categorizeGcalEvents;
const channelExpiresSoon = (expiry) => {
  if ((0, common_helpers_1.isDev)()) {
    const numMin = 10;
    logger.warn(
      `** REMINDER: In dev mode, so only checking if channel expires in next ${numMin} min`
    );
    const xMinFromNow = (0, date_utils_1.minutesFromNow)(numMin, "ms");
    const expiration = new Date(expiry).getTime();
    const channelExpiresSoon = expiration < xMinFromNow;
    return channelExpiresSoon;
  }
  const xDaysFromNow = (0, date_utils_2.daysFromNowTimestamp)(3, "ms");
  const expiration = new Date(expiry).getTime();
  const channelExpiresSoon = expiration < xDaysFromNow;
  return channelExpiresSoon;
};
exports.channelExpiresSoon = channelExpiresSoon;
/*
The channelId should also be found, but this is a sanity-check
in case something unexpected happened
*/
const channelNotFound = (calendar, channelId) => {
  const matchingChannelIds = calendar.google.items.filter(
    (c) => c.sync.channelId === channelId
  );
  if (matchingChannelIds.length != 1) {
    return true;
  } else {
    // if exactly 1 entry, then the correct channel was found
    return false;
  }
};
exports.channelNotFound = channelNotFound;
const channelRefreshNeeded = (reqParams, calendar) => {
  //todo test if any channelIds in items match
  const _channelNotFound = (0, exports.channelNotFound)(
    calendar,
    reqParams.channelId
  );
  const _channelExpiresSoon = (0, exports.channelExpiresSoon)(
    reqParams.expiration
  );
  const refreshNeeded = _channelNotFound || _channelExpiresSoon;
  if (refreshNeeded) {
    logger.debug(`Refresh needed because:
        Channel expired? : ${_channelNotFound.toString()}
        Channel expiring soon? : ${_channelExpiresSoon.toString()}`);
  }
  return refreshNeeded;
};
exports.channelRefreshNeeded = channelRefreshNeeded;
const findCalendarByResourceId = (
  //todo loop through items.sync for the one that matches the resourceId,
  // then grab that one's nextSyncToken
  resourceId,
  calendarList
) => {
  const matches = calendarList.google.items.filter((g) => {
    return g.sync.resourceId === resourceId;
  });
  if (matches.length !== 1) {
    logger.error(`No calendar has resourceId: ${resourceId}`);
  }
  if (matches.length > 1) {
    throw new errors_base_1.BaseError(
      "Duplicate resourceIds",
      `Multiple calendars share resourceId: ${resourceId}`,
      status_codes_1.Status.BAD_REQUEST,
      false
    );
  }
  return matches[0];
};
exports.findCalendarByResourceId = findCalendarByResourceId;
const getChannelExpiration = () => {
  if ((0, common_helpers_1.isDev)()) {
    const numMin = parseInt(process.env.CHANNEL_EXPIRATION_DEV_MIN);
    logger.warn(
      `\n** REMINDER: In dev mode, so channel is expiring in just ${numMin} mins **\n`
    );
    const devExpiration = (0, date_utils_1.minutesFromNow)(
      numMin,
      "ms"
    ).toString();
    return devExpiration;
  }
  const numDays = parseInt(process.env.CHANNEL_EXPIRATION_PROD_DAYS);
  const prodExpiration = (0, date_utils_2.daysFromNowTimestamp)(
    numDays,
    "ms"
  ).toString();
  return prodExpiration;
};
exports.getChannelExpiration = getChannelExpiration;
const hasExpectedHeaders = (headers) => {
  const hasExpected =
    typeof headers["x-goog-channel-id"] === "string" &&
    typeof headers["x-goog-resource-id"] === "string" &&
    typeof headers["x-goog-resource-state"] === "string" &&
    typeof headers["x-goog-channel-expiration"] === "string";
  return hasExpected;
};
exports.hasExpectedHeaders = hasExpectedHeaders;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luYy5oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvc3luYy9zZXJ2aWNlcy9zeW5jLmhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsdURBQW1EO0FBQ25ELDBEQUFxRDtBQUNyRCw0REFBbUQ7QUFDbkQsc0RBQXVEO0FBQ3ZELHNEQUE2RDtBQUk3RCx5REFBOEM7QUFDOUMsZ0VBQXFEO0FBQ3JELDZFQUFnRjtBQUNoRiwyRUFBK0Q7QUFFL0QsTUFBTSxNQUFNLEdBQUcsSUFBQSx1QkFBTSxFQUFDLGtCQUFrQixDQUFDLENBQUM7QUFFbkMsTUFBTSxzQkFBc0IsR0FBRyxDQUNwQyxNQUFjLEVBQ2QsY0FBd0IsRUFDeEIsY0FBK0IsRUFDL0IsRUFBRTtJQUNGLE1BQU0sY0FBYyxHQUE0QixFQUFFLENBQUM7SUFFbkQsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUM3QixjQUFjLENBQUMsSUFBSSxDQUFDO1lBQ2xCLFVBQVUsRUFBRTtnQkFDVixNQUFNLEVBQUU7b0JBQ04sSUFBSSxFQUFFLE1BQU07b0JBQ1osUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRTtpQkFDbEM7YUFDRjtTQUNGLENBQUMsQ0FBQztLQUNKO0lBRUQsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUM3QixNQUFNLE9BQU8sR0FBRyxvQkFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLHVCQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFMUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQWUsRUFBRSxFQUFFO1lBQ2xDLGNBQWMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xCLFNBQVMsRUFBRTtvQkFDVCxNQUFNLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUs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
