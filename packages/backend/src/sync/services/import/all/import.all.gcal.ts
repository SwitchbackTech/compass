import { Origin } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
import {
  gCalendar,
  gParamsImportAllEvents,
  gSchema$Event,
} from "@core/types/gcal";
import { EventError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import eventService from "@backend/event/services/event.service";
import { Callback_EventProcessor, Map_ImportAll } from "../sync.import.types";

const logger = Logger("sync.import.all.gcal");

/**
 * Generic helper: Fetches events page by page, processes using a callback, and saves.
 */
export const fetchAndProcessEventsPageByPage = async (
  userId: string,
  gcal: gCalendar,
  calendarId: string,
  gcalApiParams: gParamsImportAllEvents,
  // Callback function to process each event and decide if it should be saved
  eventProcessor: Callback_EventProcessor,
  // Shared state accessible/modifiable by the processor
  sharedState: Map_ImportAll,
  captureSyncToken: boolean,
): Promise<{
  savedCount: number;
  processedCount: number;
  nextSyncToken: string | undefined;
}> => {
  let nextPageToken: string | undefined = undefined;
  let finalNextSyncToken: string | undefined = undefined;
  let totalProcessedApi = 0;
  let totalSaved = 0;
  const passIdentifier = gcalApiParams.singleEvents ? "Pass 2" : "Pass 1"; // For logging

  logger.info(
    `${passIdentifier}: Fetching events for ${calendarId}. Params: ${JSON.stringify(gcalApiParams)}`,
  );

  do {
    const params: gParamsImportAllEvents = {
      calendarId,
      pageToken: nextPageToken,
      maxResults: 250, // Consider making configurable
      ...gcalApiParams, // Spread specific parameters like singleEvents
    };

    const gEventsResponse = await gcalService.getEvents(gcal, params);

    // Handle cases where the API call might fail or return unexpected structure
    if (!gEventsResponse?.data) {
      // Check for data property
      logger.warn(
        `${passIdentifier}: Invalid response structure or error fetching page for ${calendarId}. PageToken: ${nextPageToken}`,
        gEventsResponse,
      );
      if (!nextPageToken && totalProcessedApi === 0) {
        // Error on first fetch is critical
        throw error(
          EventError.NoGevents, // Or a more specific Gcal API error
          `${passIdentifier}: Initial fetch failed or returned invalid data for ${calendarId}`,
        );
      }
      break; // Stop processing this pass/call
    }

    const eventsFromApi = gEventsResponse.data.items || []; // Ensure items is an array
    totalProcessedApi += eventsFromApi.length;

    if (eventsFromApi.length > 0) {
      const eventsToSave: gSchema$Event[] = [];
      eventsFromApi.forEach((event) => {
        // Call the provided processor function
        const shouldSave = eventProcessor(event, sharedState);
        if (shouldSave) {
          eventsToSave.push(event);
        }
      });

      if (eventsToSave.length > 0) {
        const cEvents = MapEvent.toCompass(
          userId,
          eventsToSave,
          Origin.GOOGLE_IMPORT,
        );
        if (cEvents.length > 0) {
          try {
            const result = await eventService.createMany(cEvents);
            // Safely access insertedCount (assuming result object structure)
            const savedCount =
              result && typeof result.insertedCount === "number"
                ? result.insertedCount
                : 0;
            totalSaved += savedCount;
            // logger.debug(`${passIdentifier}: Saved ${savedCount} events this page.`); // Reduce noise
          } catch (dbError) {
            logger.error(
              `${passIdentifier}: Error saving events to database.`,
              { error: dbError, count: cEvents.length },
            );
            // Potentially re-throw if database errors should halt the entire sync
            // throw dbError;
          }
        }
      }
    }

    nextPageToken = gEventsResponse.data.nextPageToken ?? undefined;
    // Capture nextSyncToken ONLY on the last page AND if requested
    if (captureSyncToken && !nextPageToken) {
      finalNextSyncToken = gEventsResponse.data.nextSyncToken ?? undefined;
      logger.info(
        `${passIdentifier}: Reached last page. Got nextSyncToken: ${finalNextSyncToken ? "..." : "null"}`,
      );
    }
  } while (nextPageToken !== undefined);

  logger.info(
    `${passIdentifier} completed for ${calendarId}. Processed ${totalProcessedApi} API events. Saved ${totalSaved} total events.`,
  );

  return {
    savedCount: totalSaved,
    processedCount: totalProcessedApi,
    nextSyncToken: finalNextSyncToken, // Will be undefined if captureSyncToken was false
  };
};
