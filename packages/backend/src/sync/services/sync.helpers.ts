import { gSchema$Event, gSchema$Events } from "declarations";
import { param } from "express-validator";

import { Event, Params$DeleteMany } from "@core/types/event.types";
import { BaseError } from "@common/errors/errors.base";
import { Collections } from "@common/constants/collections";
import { Logger } from "@common/logger/common.logger";
import mongoService from "@common/services/mongo.service";
import { cancelledEventsIds } from "@common/services/gcal/gcal.helpers";
import { OAuthDTO } from "@core/types/auth.types";
import { getGcal } from "@auth/services/google.auth.service";
import { GCAL_PRIMARY } from "@common/constants/backend.constants";
import gcalService from "@common/services/gcal/gcal.service";
import { GcalMapper } from "@common/services/gcal/map.gcal";
import eventService from "@event/services/event.service";
import { SyncParams$Gcal } from "@core/types/sync.types";

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

export const syncUpdates = async (params: SyncParams$Gcal) => {
  const syncResult = {
    syncToken: undefined,
    updated: undefined,
    deleted: undefined,
  };
  // use calendarId to find the compass user
  const oauth = await mongoService.db
    .collection(Collections.OAUTH)
    .findOne({ resourceId: params.resourceId });

  //todo validate oauth response

  const gcal = await getGcal(oauth.user);

  if (oauth && oauth.state == params.calendarId) {
    logger.debug("Finding new events");

    // Fetch the changes to events //
    // Note: will potentially need to handle pageToken in case a lot of new events
    // changed

    const updatedEvents = await gcalService.getEvents(gcal, {
      calendarId: GCAL_PRIMARY, // todo revert back to actual id?
      syncToken: oauth.tokens.nextSyncToken,
    });
    logger.debug(`found ${updatedEvents.data.items.length} events:`);
    logger.debug(JSON.stringify(updatedEvents.data.items));

    const syncTokenUpdateResult = await updateNextSyncToken(
      oauth.user,
      updatedEvents.data.nextSyncToken
    );
    syncResult.syncToken = syncTokenUpdateResult;

    // Sync the changes to our DB //
    const { eventsToDelete, eventsToUpdate } = categorizeGcalEvents(
      updatedEvents.data.items
    );

    if (eventsToDelete.length > 0) {
      logger.debug(
        `Found ${eventsToDelete.length} events to delete: ${eventsToDelete}`
      );
      const deleteParams: Params$DeleteMany = {
        key: "gEventId",
        ids: eventsToDelete,
      };
      const deleteResult = await eventService.deleteMany(
        oauth.user,
        deleteParams
      );
      syncResult.deleted = deleteResult;
    }

    if (eventsToUpdate.length > 0) {
      const cEvents = GcalMapper.toCompass(oauth.user, eventsToUpdate);
      const updateResult = await updateEventsAfterGcalChange(
        oauth.user,
        cEvents
      );
      syncResult.updated = updateResult;
    }
  }
  return syncResult;
};

export const updateEventsAfterGcalChange = async (
  userId: string,
  events: gSchema$Event[]
) => {
  /*
    TODO change to
      updateMany(upsert: true, eventsToUpdate)
      - creates doc if none match already
      //TODO try getting this to work in one `updateMany` query
      // - map the gEventIds before hand and push onto a [] for all updates (?)
      //    - could be risky
  */
  try {
    events.map(async (event: Event) => {
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
    const gEventIds = events.map((e: Event) => e.gEventId);
    logger.debug(
      "Tried updating/creating events with these gEventIds:",
      gEventIds
    );
    return "it worked i think";
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
