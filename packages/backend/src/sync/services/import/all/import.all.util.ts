import dayjs from "dayjs";
import { Logger } from "@core/logger/winston.logger";
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
