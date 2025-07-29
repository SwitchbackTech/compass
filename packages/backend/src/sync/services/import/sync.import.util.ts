import { AnyBulkWriteOperation, ObjectId } from "mongodb";
import {
  Event_Core,
  RecurrenceWithoutId,
  Schema_Event_Core,
  Schema_Event_Regular,
  WithoutCompassId,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { isBase, isInstanceWithoutId } from "@core/util/event/event.util";
import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.utils";
import { Event_Core_WithObjectId } from "@backend/sync/sync.types";

export const assembleEventOperations = (
  userId: string,
  eventsToDelete: string[],
  eventsToUpdate: Schema_Event_Core[],
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
    eventsToUpdate.forEach((e: Schema_Event_Core) => {
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

/**
 * Organizes gcal events by type and returns the events to delete and the events to update
 * @param events - The events, organized by type. The 'toUpdate' object contains two arrays:
 * - 'recurring': A *subset* of the events to update, which does not include all expanded instances
 * - 'nonRecurring': The non-recurring events
 * @returns The events to delete and the events to update
 */
export const organizeGcalEventsByType = (events: gSchema$Event[]) => {
  const toDelete = cancelledEventsIds(events);

  // If its going to be deleted anyway, then don't bother updating
  const _isntBeingDeleted = (e: gSchema$Event) =>
    !toDelete.includes(e.id as string);

  const toUpdate = events.filter((e) => _isntBeingDeleted(e));

  // Split events into recurring and non-recurring
  const recurringEvents = toUpdate.filter(
    (e) => e.recurringEventId || e.recurrence,
  );
  const nonRecurringEvents = toUpdate.filter(
    (e) => !e.recurringEventId && !e.recurrence,
  );

  const categorized = {
    toDelete,
    toUpdate: {
      recurring: recurringEvents,
      nonRecurring: nonRecurringEvents,
    },
  };
  return categorized;
};

/**
 * Assigns IDs to events
 * will map instance events to their base events
 * @param events - The events to assign IDs
 * @returns The events with IDs assigned
 */
export const assignIdsToEvents = (
  events: Array<RecurrenceWithoutId | WithoutCompassId<Schema_Event_Regular>>,
): Array<Event_Core_WithObjectId> => {
  const idMaps = new Map<string, ObjectId>();

  return events.map((e) => {
    const event = e as Event_Core;
    const isBaseEvent = isBase(event);
    const isInstance = isInstanceWithoutId(event);
    const isRegularEvent = !isBaseEvent && !isInstance;
    const baseEventId = event?.gRecurringEventId ?? event?.gEventId!;

    if (!idMaps.get(baseEventId)) idMaps.set(baseEventId, new ObjectId());

    const baseEventObjectId = idMaps.get(baseEventId)!;

    return {
      ...event,
      _id: isBaseEvent ? baseEventObjectId : new ObjectId(),
      recurrence: (isRegularEvent
        ? undefined
        : isInstance
          ? { eventId: baseEventObjectId.toString() }
          : event.recurrence) as { rule: string[] },
    };
  });
};
