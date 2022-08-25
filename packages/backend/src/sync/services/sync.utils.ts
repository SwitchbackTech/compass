import { AnyBulkWriteOperation } from "mongodb";
import { gSchema$Event } from "@core/types/gcal";
import { MapEvent } from "@core/mappers/map.event";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { minutesFromNow } from "@core/util/date.utils";
import { Schema_Event } from "@core/types/event.types";
import { Origin } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { Schema_Sync } from "@core/types/sync.types";
import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.utils";
import { ENV } from "@backend/common/constants/env.constants";

const logger = Logger("app:sync.helpers");

export const assembleEventOperations = (
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
    const cEvents = MapEvent.toCompass(userId, eventsToUpdate, Origin.GOOGLE);

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
  //-- check if you should ignore it (using data.updated)
  const toDelete = cancelledEventsIds(events);

  // if its going to be deleted anyway, then dont bother updating
  const _isntBeingDeleted = (e: gSchema$Event) =>
    !toDelete.includes(e.id as string);

  const toUpdate = events.filter((e) => _isntBeingDeleted(e));

  const categorized = {
    toDelete,
    toUpdate,
  };
  return categorized;
};

export const channelExpiresSoon = (expiry: string) => {
  const numMin = Math.round(parseInt(ENV.CHANNEL_EXPIRATION_MIN) / 2);
  const xMinFromNow = minutesFromNow(numMin, "ms");
  const expiration = new Date(expiry).getTime();
  const channelExpiresSoon = expiration < xMinFromNow;

  return channelExpiresSoon;
};

export const findCalendarId = (resourceId: string, sync: Schema_Sync) => {
  const matches = sync.google.events.filter((g) => {
    return g.resourceId === resourceId;
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

  return matches[0]?.gCalendarId;
};

export const getChannelExpiration = () => {
  const numMin = parseInt(ENV.CHANNEL_EXPIRATION_MIN);
  logger.debug(`** REMINDER: Channel will expire in ${numMin} minutes **\n`);
  const expiration = minutesFromNow(numMin, "ms").toString();
  return expiration;
};

export const getSummary = (
  eventsToUpdate: gSchema$Event[],
  eventsToDelete: string[]
) => {
  let updateSummary = "";
  let deleteSummary = "";
  const min = 0;
  const max = 3;

  if (eventsToUpdate.length > min) {
    if (eventsToUpdate.length < max) {
      updateSummary = `updating: "${eventsToUpdate
        .map((e) => e.summary)
        .toString()}" `;
    } else {
      updateSummary = `updating ${eventsToUpdate.length}`;
    }
  }

  if (eventsToDelete.length > min) {
    if (eventsToDelete.length < max) {
      deleteSummary = `deleting: ${eventsToDelete.toString()}`; // will just be the googleId
    } else {
      deleteSummary = ` deleting ${eventsToDelete.length}`;
    }
  }

  let summary = "";
  if (updateSummary !== "") summary += updateSummary;
  if (deleteSummary !== "") summary += deleteSummary;

  return summary;
};

export const hasGoogleHeaders = (headers: object) => {
  const expected = [
    "x-goog-channel-id",
    "x-goog-resource-id",
    "x-goog-resource-state",
    "x-goog-channel-expiration",
  ];

  const hasHeaders = expected.every((i) => i in headers);

  return hasHeaders;
};

/* 
this can happen if sync fails unexpetedly,
(eg server was down for awhile and it expired)
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
*/

/*
export const channelRefreshNeeded = (channelId: string, expiration: string) => {
  // --
  // const _channelNotFound = channelNotFound(calendar, channelId);
  // const refreshNeeded = _channelNotFound || _channelExpiresSoon;
  const _channelExpiresSoon = channelExpiresSoon(expiration);
  const refreshNeeded = _channelExpiresSoon;

  if (refreshNeeded) {
    logger.debug(
      `Refresh needed because:
      Channel expired? : maybe
      Channel expiring soon? : ${_channelExpiresSoon.toString()}`
    );
  }

  return refreshNeeded;
};
*/
