import { AnyBulkWriteOperation } from "mongodb";
import { gSchema$Event } from "declarations";

import { Event } from "@core/types/event.types";
import { Logger } from "@common/logger/common.logger";
import mongoService from "@common/services/mongo.service";
import { cancelledEventsIds } from "@common/services/gcal/gcal.helpers";
import { GcalMapper } from "@common/services/gcal/map.gcal";
import { Collections } from "@common/constants/collections";
import { BaseError } from "@common/errors/errors.base";
import { daysFromNowTimestamp } from "@core/util/date.utils";
import { Request_Sync_Gcal } from "@core/types/sync.types";
import { Schema_Calendar } from "@core/types/calendar.types";

import { minutesFromNow } from "../../../../core/src/util/date.utils";

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
    const cEvents = GcalMapper.toCompass(userId, eventsToUpdate);

    cEvents.forEach((e: Event) => {
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

  // assume that everything that shouldnt be deleted
  // should be updated
  const toUpdate = events.filter((e) => !toDelete.includes(e.id));

  const categorized = {
    eventsToDelete: toDelete,
    eventsToUpdate: toUpdate,
  };
  return categorized;
};

export const channelExpired = (
  calendar: Schema_Calendar,
  channelId: string
) => {
  const matchingChannelIds = calendar.google.items.filter(
    (c) => c.sync.channelId === channelId
  );
  if (matchingChannelIds.length < 1) {
    return false;
  } else {
    return true;
  }
};

export const channelExpiresSoon = (expiry: string) => {
  // Temp: testing sync
  const xMinFromNow = minutesFromNow(2, "ms");
  const expiration = new Date(expiry).getTime();
  const channelExpiresSoon = expiration < xMinFromNow;

  // TODO re-enable
  // const xDaysFromNow = daysFromNowTimestamp(3, "ms");
  // const expiration = new Date(expiry).getTime();
  // const channelExpiresSoon = expiration < xDaysFromNow;
  return channelExpiresSoon;
};

export const channelRefreshNeeded = (
  reqParams: Request_Sync_Gcal,
  calendar: Schema_Calendar
) => {
  //todo test if any channelIds in items match
  const _channelExpired = channelExpired(calendar, reqParams.channelId);
  const _channelExpiresSoon = channelExpiresSoon(reqParams.expiration);

  const refreshNeeded = _channelExpired || _channelExpiresSoon;

  if (refreshNeeded) {
    logger.debug(
      `Refresh needed:
        Channel expired? : ${channelExpired.toString()}
        Channel expiring soon? : ${_channelExpiresSoon.toString()}`
    );
  }

  return refreshNeeded;
};

export const updateNextSyncToken = async (
  userId: string,
  nextSyncToken: string
) => {
  //TODO update the next sync token on the calendar list, not the user
  logger.debug(`Updating nextSyncToken to: ${nextSyncToken}`);

  const err = new BaseError(
    "Update Failed",
    `Failed to update the nextSyncToken for calendar record of user: ${userId}`,
    500,
    true
  );

  try {
    // updates the primary calendar's nextSyncToken
    // query will need to be updated once supporting non-primary calendars
    const result = await mongoService.db
      .collection(Collections.CALENDAR)
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
      logger.error("nextSyncToken not properly updated");
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
    .collection(Collections.CALENDAR)
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

export const updateResourceIdAndChannelId = async (
  userId: string,
  channelId: string,
  resourceId: string
) => {
  const result = await mongoService.db
    .collection(Collections.CALENDAR)
    .findOneAndUpdate(
      // TODO update after supporting more calendars
      { user: userId, "google.items.primary": true },
      {
        $set: {
          "google.items.$.sync.channelId": channelId,
          "google.items.$.sync.resourceId": resourceId,
        },
      }
    );

  return result;
};
