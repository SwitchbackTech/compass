import { gSchema$Event } from "declarations";

import { OAuthDTO } from "@core/types/auth.types";
import { Event, Params$DeleteMany } from "@core/types/event.types";
import { SyncParams$Gcal } from "@core/types/sync.types";
import { BaseError } from "@common/errors/errors.base";
import { Collections } from "@common/constants/collections";
import { Logger } from "@common/logger/common.logger";
import mongoService from "@common/services/mongo.service";
import { cancelledEventsIds } from "@common/services/gcal/gcal.helpers";
import { getGcal } from "@auth/services/google.auth.service";
import { GCAL_PRIMARY } from "@common/constants/backend.constants";
import gcalService from "@common/services/gcal/gcal.service";
import { GcalMapper } from "@common/services/gcal/map.gcal";
import eventService from "@event/services/event.service";
import { Status } from "@common/errors/status.codes";

const logger = Logger("app:sync.helpers");

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

const syncDeletedEventsToCompass = async (
  userId: string,
  eventsToDelete: string[]
) => {
  logger.debug(
    `Found ${eventsToDelete.length} events to delete:`,
    eventsToDelete
  );
  const deleteParams: Params$DeleteMany = {
    key: "gEventId",
    ids: eventsToDelete,
  };
  const deleteResult = await eventService.deleteMany(userId, deleteParams);
  return deleteResult;
};

const syncUpdatedEventsToCompass = async (
  userId: string,
  eventsToUpdate: gSchema$Event[]
) => {
  try {
    const cEvents = GcalMapper.toCompass(userId, eventsToUpdate);
    const gEventIds = cEvents.map((e: Event) => e.gEventId);
    logger.debug(
      "Trying to update/create events with these gEventIds:",
      gEventIds
    );

    const updatePromises = cEvents.map(async (event: Event) => {
      //  TODO validate

      //  finds and updates the event, by using gcal id
      // (cuz won't know ccal id when it comes from google)
      // if the event isnt found, its created
      const updateResult = await mongoService.db
        .collection(Collections.EVENT)
        .updateOne(
          { gEventId: event.gEventId, user: userId },
          { $set: event },
          { upsert: true }
        );

      return updateResult;
    });
    const allResults = await Promise.all(updatePromises);

    return allResults;
    // return { updated: updated, created: created, problems: problemEvents };
  } catch (e) {
    logger.error(e);
    return new BaseError(
      "Updating changes from GCal -> CCal Failed",
      e,
      500,
      true
    );
  }
};

export const syncUpdates = async (params: SyncParams$Gcal) => {
  //todo try-catch
  try {
    const syncResult = {
      syncToken: undefined,
      updated: undefined,
      deleted: undefined,
    };
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

    logger.debug("Fetching gcal events");
    const updatedEvents = await gcalService.getEvents(gcal, {
      // TODO use calendarId once supporting non-'primary' calendars
      // calendarId: params.calendarId,
      calendarId: GCAL_PRIMARY,
      syncToken: oauth.tokens.nextSyncToken,
    });
    logger.debug(`Found ${updatedEvents.data.items.length} events:`);
    const eventNames = updatedEvents.data.items.map((e) => e.summary);
    logger.debug(JSON.stringify(eventNames));

    // Save the updated sync token for next time
    const syncTokenUpdateResult = await updateNextSyncToken(
      oauth.state,
      updatedEvents.data.nextSyncToken
    );
    syncResult.syncToken = syncTokenUpdateResult;

    // Update Compass' DB
    const { eventsToDelete, eventsToUpdate } = categorizeGcalEvents(
      updatedEvents.data.items
    );

    const bulkArr = [];

    if (eventsToDelete.length > 0) {
      bulkArr.push({
        deleteMany: {
          filter: {
            user: oauth.user,
            gEventId: { $in: eventsToDelete },
          },
        },
      });
    }
    if (eventsToUpdate.length > 0) {
      const cEvents = GcalMapper.toCompass(oauth.user, eventsToUpdate);
      cEvents.forEach((e: Event) => {
        bulkArr.push({
          updateOne: {
            filter: { gEventId: e.gEventId, user: oauth.user },
            update: { $set: e },
            options: { upsert: true },
          },
        });
      });
    }

    const res = await mongoService.db
      .collection(Collections.EVENT)
      .bulkWrite(bulkArr);
    return res;
  } catch (e) {
    logger.error(`Errow while sycning\n`, e);
  }

  /*
  if (eventsToDelete.length > 0) {
    syncResult.deleted = await syncDeletedEventsToCompass(
      oauth.user,
      eventsToDelete
    );
  }

  if (eventsToUpdate.length > 0) {
    syncResult.updated = await syncUpdatedEventsToCompass(
      oauth.user,
      eventsToUpdate
    );
  }

  return syncResult;
  */
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
