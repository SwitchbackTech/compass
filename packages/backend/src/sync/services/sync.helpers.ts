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
    ignore: [],
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
  const cEvents = GcalMapper.toCompass(userId, eventsToUpdate);
  {
    const gEventIds = cEvents.map((e: Event) => e.gEventId);
    logger.debug(
      "Tried updating/creating events with these gEventIds:",
      gEventIds
    );
    try {
      /*
      TODO change to
        updateMany(upsert: true, eventsToUpdate)
        ?- map the gEventIds before hand and push onto a [] for all updates (?)
        - creates doc if none match already
    */
      cEvents.map(async (event: Event) => {
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
      });

      return "it worked maybe";
    } catch (e) {
      logger.error(e);
      return new BaseError(
        "Updating changes from GCal -> CCal Failed",
        e,
        500,
        true
      );
    }
  }
};

export const syncUpdates = async (params: SyncParams$Gcal) => {
  const syncResult = {
    syncToken: undefined,
    updated: undefined,
    deleted: undefined,
  };
  // use calendarId to find the compass user
  const oauth: OAuthDTO = await mongoService.db
    .collection(Collections.OAUTH)
    .findOne({ resourceId: params.resourceId });

  //TODO move to validation func
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

  const updatedEvents = await gcalService.getEvents(gcal, {
    calendarId: GCAL_PRIMARY, // todo revert back to actual id?
    syncToken: oauth.tokens.nextSyncToken,
  });
  logger.debug(`found ${updatedEvents.data.items.length} events:`);
  logger.debug(JSON.stringify(updatedEvents.data.items));

  // Save the updated sync token for next time
  const syncTokenUpdateResult = await updateNextSyncToken(
    oauth.user,
    updatedEvents.data.nextSyncToken
  );
  syncResult.syncToken = syncTokenUpdateResult;

  // Update Compass' DB
  const { eventsToDelete, eventsToUpdate } = categorizeGcalEvents(
    updatedEvents.data.items
  );

  if (eventsToDelete.length > 0) {
    syncResult.deleted = syncDeletedEventsToCompass(oauth.user, eventsToDelete);
  }

  if (eventsToUpdate.length > 0) {
    syncResult.updated = syncUpdatedEventsToCompass(oauth.user, eventsToUpdate);
  }

  return syncResult;
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
  calendarId: string,
  nextSyncToken: string
) => {
  logger.debug(`Updating nextSyncToken to: ${nextSyncToken}`);
  const result = await mongoService.db
    .collection(Collections.OAUTH)
    .findOneAndUpdate(
      { state: calendarId },
      {
        $set: {
          "tokens.nextSyncToken": nextSyncToken,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  if (result.ok !== 1) {
    logger.debug("nextSyncToken not updated", result.lastErrorObject);
  }
  return result;
};
