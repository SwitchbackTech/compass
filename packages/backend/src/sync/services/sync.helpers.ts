import { AnyBulkWriteOperation } from "mongodb";
import { gSchema$Event } from "declarations";

import { MapEvent } from "@core/mappers/map.event";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { minutesFromNow } from "@core/util/date.utils";
import { daysFromNowTimestamp } from "@core/util/date.utils";
import { Request_Sync_Gcal } from "@core/types/sync.types";
import { Schema_CalendarList } from "@core/types/calendar.types";
import { Schema_Event } from "@core/types/event.types";
import { Origin } from "@core/core.constants";

import { Logger } from "@backend/common/logger/common.logger";

//TODO decouple mongo from this helper file, cuz its causing
// an open handle during jest runs
import mongoService from "@backend/common/services/mongo.service";
import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.helpers";
import { Collections } from "@backend/common/constants/collections";
import { isDev } from "@backend/common/helpers/common.helpers";

const logger = Logger("app:sync.helpers");

export const assembleBulkOperations = (
  userId: string,
  eventsToDelete: string[],
  eventsToUpdate: gSchema$Event[]
) => {
  const bulkOperations: AnyBulkWriteOperation[] = [];

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
    const cEvents = MapEvent.toCompass(userId, eventsToUpdate);

    cEvents.forEach((e: Schema_Event) => {
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

export const categorizeGcalEvents = (events: gSchema$Event[]) => {
  const toDelete = cancelledEventsIds(events);

  // if its going to be deleted anyway, then dont bother updating
  const _isntBeingDeleted = (e: gSchema$Event) => !toDelete.includes(e.id);

  // if user initiated change via compass
  // then the compass database already has the change
  // and if the event originated from an import, then its also already in compass
  const _isntFromCompass = (e: gSchema$Event) =>
    e?.extendedProperties?.private?.origin !== Origin.Compass &&
    e?.extendedProperties?.private?.origin !== Origin.GoogleImport;

  const toUpdate = events.filter(
    (e) => _isntBeingDeleted(e) && _isntFromCompass(e)
  );

  const categorized = {
    eventsToDelete: toDelete,
    eventsToUpdate: toUpdate,
  };
  return categorized;
};

export const channelExpiresSoon = (expiry: string) => {
  if (isDev()) {
    const numMin = 10;
    logger.warn(
      `** REMINDER: In dev mode, so only checking if channel expires in next ${numMin} min`
    );

    const xMinFromNow = minutesFromNow(numMin, "ms");
    const expiration = new Date(expiry).getTime();
    const channelExpiresSoon = expiration < xMinFromNow;

    return channelExpiresSoon;
  }
  const xDaysFromNow = daysFromNowTimestamp(3, "ms");
  const expiration = new Date(expiry).getTime();
  const channelExpiresSoon = expiration < xDaysFromNow;
  return channelExpiresSoon;
};
/* 
The channelId should also be found, but this is a sanity-check
in case something unexpected happened
*/
export const channelNotFound = (
  calendar: Schema_CalendarList,
  channelId: string
) => {
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
export const channelRefreshNeeded = (
  reqParams: Request_Sync_Gcal,
  calendar: Schema_CalendarList
) => {
  //todo test if any channelIds in items match
  const _channelNotFound = channelNotFound(calendar, reqParams.channelId);
  const _channelExpiresSoon = channelExpiresSoon(reqParams.expiration);

  const refreshNeeded = _channelNotFound || _channelExpiresSoon;

  if (refreshNeeded) {
    logger.debug(
      `Refresh needed because:
        Channel expired? : ${_channelNotFound.toString()}
        Channel expiring soon? : ${_channelExpiresSoon.toString()}`
    );
  }

  return refreshNeeded;
};
export const findCalendarByResourceId = (
  //todo loop through items.sync for the one that matches the resourceId,
  // then grab that one's nextSyncToken
  resourceId: string,
  calendarList: Schema_CalendarList
) => {
  const matches = calendarList.google.items.filter((g) => {
    return g.sync.resourceId === resourceId;
  });

  if (matches.length !== 1) {
    logger.error(`No calendar has resourceId: ${resourceId}`);
  }

  if (matches.length > 1) {
    throw new BaseError(
      "Duplicate resourceIds",
      `Multiple calendars share resourceId: ${resourceId}`,
      Status.BAD_REQUEST,
      false
    );
  }

  return matches[0];
};

export const getChannelExpiration = () => {
  if (isDev()) {
    const numMin = parseInt(process.env.CHANNEL_EXPIRATION_DEV_MIN);
    logger.warn(
      `\n** REMINDER: In dev mode, so channel is expiring in just ${numMin} mins **\n`
    );
    const devExpiration = minutesFromNow(numMin, "ms").toString();
    return devExpiration;
  }

  const numDays = parseInt(process.env.CHANNEL_EXPIRATION_PROD_DAYS);
  const prodExpiration = daysFromNowTimestamp(numDays, "ms").toString();
  return prodExpiration;
};

export const hasExpectedHeaders = (headers: object) => {
  const hasExpected =
    typeof headers["x-goog-channel-id"] === "string" &&
    typeof headers["x-goog-resource-id"] === "string" &&
    typeof headers["x-goog-resource-state"] === "string" &&
    typeof headers["x-goog-channel-expiration"] === "string";

  return hasExpected;
};

// TODO move elsewhere (in common service?) so it can still be imported
// but doesn't tie this helper file to the mongoService
export const updateNextSyncToken = async (
  userId: string,
  nextSyncToken: string
) => {
  logger.debug(`Updating nextSyncToken to: ${nextSyncToken}`);

  const msg = `Failed to update the nextSyncToken for calendar record of user: ${userId}`;
  const err = new BaseError("Update Failed", msg, 500, true);

  try {
    // updates the primary calendar's nextSyncToken
    // query will need to be updated once supporting non-primary calendars
    const result = await mongoService.db
      .collection(Collections.CALENDARLIST)
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
};

export const updateResourceId = async (
  channelId: string,
  resourceId: string
) => {
  logger.debug(`Updating resourceId to: ${resourceId}`);
  const result = await mongoService.db
    .collection(Collections.CALENDARLIST)
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
};

export const updateSyncData = async (
  userId: string,
  channelId: string,
  resourceId: string,
  expiration: string
) => {
  const result = await mongoService.db
    .collection(Collections.CALENDARLIST)
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
};
