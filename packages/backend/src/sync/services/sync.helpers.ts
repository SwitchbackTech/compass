import { AnyBulkWriteOperation } from "mongodb";
import { gSchema$Event } from "declarations";

import { OAuthDTO } from "@core/types/auth.types";
import { Event } from "@core/types/event.types";
import { Logger } from "@common/logger/common.logger";
import mongoService from "@common/services/mongo.service";
import { cancelledEventsIds } from "@common/services/gcal/gcal.helpers";
import { GcalMapper } from "@common/services/gcal/map.gcal";
import { Collections } from "@common/constants/collections";
import { BaseError } from "@common/errors/errors.base";

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

export const updateStateAndResourceId = async (
  channelId: string,
  resourceId: string
) => {
  logger.debug("Updating state/calendarId and resourceId for future reference");
  const result = await mongoService.db
    .collection(Collections.OAUTH)
    .findOneAndUpdate(
      { state: channelId },
      {
        $set: {
          resourceId: resourceId,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  return result;
};

export const channelExpiresSoon = (expiry) => {
  const xDaysFromNow = daysFromNowTimestamp(3, "ms");
  const expiration = new Date(expiry).getTime();
  const channelExpiresSoon = expiration < xDaysFromNow;
  return channelExpiresSoon;
};

export const updateNextSyncToken = async (
  userId: string,
  nextSyncToken: string
) => {
  logger.debug(`Updating nextSyncToken to: ${nextSyncToken}`);

  const err = new BaseError(
    "Update Failed",
    `Failed to update the nextSyncToken for oauth record of user: ${userId}`,
    500,
    true
  );

  try {
    const result = await mongoService.db
      .collection(Collections.OAUTH)
      .findOneAndUpdate(
        { user: userId },
        {
          $set: {
            "tokens.nextSyncToken": nextSyncToken,
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" }
      );

    const updatedOauth: OAuthDTO = result.value;
    if (updatedOauth.tokens.nextSyncToken === nextSyncToken) {
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
