import { AnyBulkWriteOperation, BulkWriteResult } from "mongodb";
import { gSchema$Event } from "declarations";

import { OAuthDTO } from "@core/types/auth.types";
import { Event, Params$DeleteMany } from "@core/types/event.types";
import { SyncParams$Gcal, SyncEventsResult$Gcal } from "@core/types/sync.types";
import { BaseError } from "@common/errors/errors.base";
import { Collections } from "@common/constants/collections";
import { Logger } from "@common/logger/common.logger";
import mongoService from "@common/services/mongo.service";
import { cancelledEventsIds } from "@common/services/gcal/gcal.helpers";
import { getGcal } from "@auth/services/google.auth.service";
import { GCAL_PRIMARY } from "@common/constants/backend.constants";
import gcalService from "@common/services/gcal/gcal.service";
import { GcalMapper } from "@common/services/gcal/map.gcal";
import { Status } from "@common/errors/status.codes";

const logger = Logger("app:sync.helpers");

const assembleBulkOperations = (
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

export const syncUpdates = async (
  params: SyncParams$Gcal
): Promise<SyncEventsResult$Gcal | BaseError> => {
  const syncResult = {
    syncToken: undefined,
    result: undefined,
  };

  try {
    const oauth: OAuthDTO = await mongoService.db
      .collection(Collections.OAUTH)
      .findOne({ resourceId: params.resourceId });

    //TODO create validation function and move there
    // the calendarId created during watch channel setup used the oauth.state,
    //  so these should be the same.
    if (oauth.state !== params.calendarId) {
      return new BaseError(
        "Sync Failed",
        `Calendar id and oauth state didnt match. calendarId: ${params.calendarId}
    oauth.state: ${oauth.state}`,
        Status.INTERNAL_SERVER,
        false // this isnt currently stopping the program like expected. not sure why
      );
    }

    // Fetch the changes to events //
    // TODO: handle pageToken in case a lot of new events changed
    const gcal = await getGcal(oauth.user);

    logger.debug("Fetching updated gcal events");
    const updatedEvents = await gcalService.getEvents(gcal, {
      // TODO use calendarId once supporting non-'primary' calendars
      // calendarId: params.calendarId,
      calendarId: GCAL_PRIMARY,
      syncToken: oauth.tokens.nextSyncToken,
    });

    // Save the updated sync token for next time
    // Should you do this even if no update found;?
    const syncTokenUpdateResult = await updateNextSyncToken(
      oauth.state,
      updatedEvents.data.nextSyncToken
    );
    syncResult.syncToken = syncTokenUpdateResult;

    if (updatedEvents.data.items.length === 0) {
      return new BaseError(
        "No updates found",
        "Not sure if this is normal or not",
        Status.NOT_FOUND,
        true
      );
    }

    logger.debug(`Found ${updatedEvents.data.items.length} events to update`);
    // const eventNames = updatedEvents.data.items.map((e) => e.summary);
    // logger.debug(JSON.stringify(eventNames));
    // Update Compass' DB
    const { eventsToDelete, eventsToUpdate } = categorizeGcalEvents(
      updatedEvents.data.items
    );

    const bulkOperations = assembleBulkOperations(
      oauth.user,
      eventsToDelete,
      eventsToUpdate
    );

    syncResult.result = await mongoService.db
      .collection(Collections.EVENT)
      .bulkWrite(bulkOperations);

    return syncResult;
  } catch (e) {
    logger.error(`Errow while sycning\n`, e);
    return new BaseError("Sync Update Failed", e, Status.INTERNAL_SERVER, true);
  }
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

const updateNextSyncToken = async (
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
