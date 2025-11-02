import { gSchema$Event } from "@core/types/gcal";
import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.utils";

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
