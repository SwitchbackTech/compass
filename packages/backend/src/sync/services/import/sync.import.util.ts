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
