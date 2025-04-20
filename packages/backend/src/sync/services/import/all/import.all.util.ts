import dayjs from "dayjs";
import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { Event_Core } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { Event_Core_WithObjectId } from "@backend/sync/sync.types";
import { Callback_EventProcessor } from "../sync.import.types";

const logger = Logger("sync.import.all.util");

const getStartTimeString = (event: gSchema$Event): string | null => {
  if (event.start?.dateTime) {
    return event.start.dateTime;
  }
  if (event.start?.date) {
    // For all-day events, represent the start as the beginning of that day in UTC
    // This assumes MapEvent.toCompass handles all-day events similarly. Adjust if needed.
    return dayjs(event.start.date).startOf("day").toISOString();
  }
  return null;
};

// Processor for Pass 1: Identifies base/single events
export const shouldProcessDuringPass1: Callback_EventProcessor = (
  gEvent,
  state,
) => {
  if (gEvent.id) {
    if (gEvent.recurrence) {
      const startTime = getStartTimeString(gEvent);
      state.baseEventStartTimes.set(gEvent.id, startTime);
      state.processedEventIdsPass1.add(gEvent.id);
      return true; // Save base event
    } else if (!gEvent.recurringEventId) {
      // Save single event. No need to add to the map, because it won't show up in pass two
      return true;
    }
  }
  return false; // Don't save (e.g., instances encountered in Pass 1)
};

// Processor for Pass 2: Filters events based on shared state
export const shouldProcessDuringPass2: Callback_EventProcessor = (
  gEvent,
  state,
) => {
  // Filter 1: Skip event if already processed in Pass 1
  if (gEvent.id && state.processedEventIdsPass1.has(gEvent.id || "")) {
    logger.verbose(
      `Pass 2: Skipping  base event: ${gEvent.summary} (processed in Pass 1).`,
    );
    return false; // Don't save
  }

  return true; // Save this event
};

/**
 * Assigns Mongo ObjectIds to events (in-place) and links instances to their base events
 * @param events - The events to assign ids to
 */
export const assignIds = (
  events: Event_Core[] | Event_Core_WithObjectId[], // union type to allow for in-place id mutation in this function
  existingBaseEventMap: Map<string, ObjectId> = new Map(),
): Map<string, ObjectId> => {
  // First pass: identify base events and assign their IDs
  const baseEventMap = new Map(existingBaseEventMap);

  // Handle base events first
  events.forEach((event) => {
    const id = new ObjectId();
    if (event.recurrence?.rule && !event.gRecurringEventId) {
      // This is a base event
      event._id = id;
      if (event.gEventId) {
        baseEventMap.set(event.gEventId, id);
      }
    } else {
      // This is a regular event or instance
      event._id = id;
    }
  });

  // Second pass: assign IDs to instances and link them to their base events
  events.forEach((event) => {
    if (event.gRecurringEventId) {
      // This is an instance
      const baseEventId = baseEventMap.get(event.gRecurringEventId);
      if (baseEventId) {
        event.recurrence = {
          eventId: baseEventId.toString(),
        };
      }
    }
  });

  return baseEventMap;
};
