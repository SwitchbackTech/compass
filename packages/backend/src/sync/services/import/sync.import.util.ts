import { AnyBulkWriteOperation } from "mongodb";
import { MapEvent } from "@core/mappers/map.event";
import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.utils";

export const assembleEventOperations = (
  userId: string,
  eventsToDelete: string[],
  eventsToUpdate: gSchema$Event[],
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
    const cEvents = MapEvent.toCompass(userId, eventsToUpdate);

    cEvents.forEach((e: Schema_Event) => {
      bulkOperations.push({
        replaceOne: {
          filter: { gEventId: e.gEventId, user: userId },
          replacement: e,
          upsert: true,
        },
      });
    });
  }

  return bulkOperations;
};

export const categorizeGcalEvents = (events: gSchema$Event[]) => {
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

export const getSummary = (
  eventsToUpdate: gSchema$Event[],
  eventsToDelete: string[],
  resourceId: string,
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
      updateSummary = `updating ${eventsToUpdate.length} `;
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

  summary += ` | ${resourceId}`;

  return summary;
};
