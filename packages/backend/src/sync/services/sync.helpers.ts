import { AnyBulkWriteOperation } from "mongodb";
import { gSchema$Event } from "declarations";

import { OAuthDTO } from "@core/types/auth.types";
import { Event } from "@core/types/event.types";
import { Logger } from "@common/logger/common.logger";
import mongoService from "@common/services/mongo.service";
import { cancelledEventsIds } from "@common/services/gcal/gcal.helpers";
import { GcalMapper } from "@common/services/gcal/map.gcal";
import { Collections } from "@common/constants/collections";

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

  logger.debug("bulkOperations:", bulkOperations);
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
  calendarId: string,
  resourceId: string
) => {
  logger.debug("Updating state/calendarId and resourceId for future reference");
  const result = await mongoService.db
    .collection(Collections.OAUTH)
    .findOneAndUpdate(
      { state: calendarId },
      {
        $set: {
          resourceId: resourceId,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  return result;
};

export const updateNextSyncToken = async (
  oauthState: string,
  nextSyncToken: string
) => {
  logger.debug(`Updating nextSyncToken to: ${nextSyncToken}`);
  const result = await mongoService.db
    .collection(Collections.OAUTH)
    .findOneAndUpdate(
      { state: oauthState },
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
    logger.error("nextSyncToken not updated");
    return { status: "Failed to update", debugResult: result };
  }
};
