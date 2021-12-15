import { gSchema$Event, gSchema$Events } from "declarations";

import { Event } from "@core/types/event.types";
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
