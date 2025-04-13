import dayjs from "dayjs";
import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { Event_Core } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
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
  event,
  state,
) => {
  if (event.id) {
    if (event.recurrence) {
      const startTime = getStartTimeString(event);
      state.baseEventStartTimes.set(event.id, startTime);
      state.processedEventIdsPass1.add(event.id);
      return true; // Save base event
    } else if (!event.recurringEventId) {
      state.processedEventIdsPass1.add(event.id);
      return true; // Save single event
    }
  }
  return false; // Don't save (e.g., instances encountered in Pass 1)
};

// Processor for Pass 2: Filters events based on shared state
export const shouldProcessDuringPass2: Callback_EventProcessor = (
  event,
  state,
) => {
  // Filter 1: Skip event if already processed in Pass 1
  if (state.processedEventIdsPass1.has(event.id || "")) {
    logger.verbose(`Pass 2: Skipping event ${event.id} (processed in Pass 1).`); // Reduce noise
    return false; // Don't save
  }

  // Filter 2: Skip first instance if start matches base event start
  if (event.recurringEventId && event.id) {
    const baseStartTime = state.baseEventStartTimes.get(event.recurringEventId);
    if (baseStartTime !== undefined) {
      const instanceStartTime = getStartTimeString(event);
      const isFirstInstance =
        baseStartTime &&
        instanceStartTime &&
        baseStartTime === instanceStartTime;
      if (isFirstInstance) {
        logger.verbose(
          `Pass 2: Skipping event ${event.id} (first instance match).`,
        ); // Reduce noise
        return false; // Don't save
      }
    } else {
      logger.warn(
        `Pass 2: Instance ${event.id} found, base ${event.recurringEventId} unknown. Saving.`,
      );
    }
  }
  // Event passed filters
  return true; // Save this event
};

/**
 * Assigns Mongo ObjectIds to events and links instances to their base events
 * @param events - The events to assign ids to
 */
export const assignIds = (
  events: Event_Core[],
  existingBaseEventMap: Map<string, ObjectId> = new Map(),
): Map<string, ObjectId> => {
  // First pass: identify base events and assign their IDs
  const baseEventMap = new Map(existingBaseEventMap);

  // Handle base events first
  events.forEach((event) => {
    const id = new ObjectId();
    if (event.recurrence?.rule && !event.gRecurringEventId) {
      // This is a base event
      // const baseEventId = new ObjectId();
      //@ts-expect-error - we are setting the _id as an ObjectId
      event._id = id;
      console.log(id, event._id, " (", event.title, ")");
      if (event.gEventId) {
        baseEventMap.set(event.gEventId, id);
      }
    } else {
      // This is a regular event or instance
      //@ts-expect-error - we are setting the _id as an ObjectId
      event._id = id;
      console.log(id, event._id, " (", event.title, ")");
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
        console.log(event._id, " (", event.title, ")");
      }
    }
  });

  return baseEventMap;
};
