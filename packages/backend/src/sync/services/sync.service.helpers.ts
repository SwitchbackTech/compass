import { gSchema$Event, gSchema$Events } from "declarations";

import { BaseError } from "@common/errors/errors.base";
import { Collections } from "@common/constants/collections";
import { Logger } from "@common/logger/common.logger";
import mongoService from "@common/services/mongo.service";
import { cancelledEventsIds } from "@common/services/gcal/gcal.helpers";
import eventService from "@event/services/event.service";

/* 
Helpers
*/

const logger = Logger("app:sync.service.helpers");

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

export const updateEventsAfterGcalChange = async (
  userId: string,
  events: gSchema$Event[]
) => {
  /*
          1 - categorize:
            eventsToDel = [{}, {}]
              - event.status === cancelled
              - future: handle recurring events, too (not just deleting them like here)

            eventsToUpdate = [{}, {}]
              - event.status === confirmed | tentative

          2 update 
            updateMany(upsert: true, eventsToUpdate)
            - creates doc if none match already
          */

  try {
    //TODO try getting this to work in one `updateMany` query
    // - map the gEventIds before hand and push onto a [] for all updates (?)
    //    - could be risky
    events.map(async (event: Event) => {
      /* TODO move this somewhere before this step
      // Deleted Events //
      if (event.status && event.status == "cancelled") {
        await mongoService.db
          .collection(Collections.EVENT)
          .deleteOne({ id: event.id });
        console.log("TODO: Removed event =>", event.id);
      }
      */

      //  TODO validate

      //  find and update the event, by using gcal id
      // (cuz won't know ccal id when it comes from google)
      const updateResult = await mongoService.db
        .collection(Collections.EVENT)
        .updateOne(
          { gEventId: event.gEventId, user: userId },
          { $set: event },
          { upsert: true }
        );
      logger.debug("update Result:");
      logger.debug(JSON.stringify(updateResult));
      logger.debug("Updated Event with gEventId =>", event.gEventId);
    });
    return "idk - i think it worked";
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
  logger.debug("Updating state/calendarId for future reference");
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
