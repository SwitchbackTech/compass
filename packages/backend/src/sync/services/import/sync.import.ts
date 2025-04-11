import dayjs from "dayjs";
import { Origin } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
import { Schema_Event_Core } from "@core/types/event.types";
import {
  gCalendar,
  gParamsImportAllEvents,
  gSchema$Event,
} from "@core/types/gcal";
import { Schema_Sync } from "@core/types/sync.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Collections } from "@backend/common/constants/collections";
import { ENV } from "@backend/common/constants/env.constants";
import {
  EventError,
  GcalError,
  GenericError,
  SyncError,
} from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import {
  getSync,
  updateSync,
  updateSyncTokenFor,
} from "@backend/sync/util/sync.queries";
import {
  hasAnyActiveEventSync,
  isUsingHttps,
} from "@backend/sync/util/sync.util";
import { getCalendarsToSync } from "../init/sync.init";
import syncService from "../sync.service";
import { assembleEventWatchPayloads } from "../watch/sync.watch";
import {
  EventProcessorCallback,
  EventsToModify,
  ImportAllSharedState,
} from "./sync.import.types";
import { organizeGcalEventsByType } from "./sync.import.util";

const logger = Logger("app:sync.import");

// Helper function to get a consistent start time string from a Google Event
const getStartTimeString = (event: gSchema$Event): string | null => {
  if (event.start?.dateTime) {
    return event.start.dateTime;
  }
  if (event.start?.date) {
    // For all-day events, represent the start as the beginning of that day in UTC
    return dayjs(event.start.date).startOf("day").toISOString();
  }
  return null;
};

export class SyncImport {
  private gcal: gCalendar;

  constructor(gcal: gCalendar) {
    this.gcal = gcal;
  }

  /**
   * Assembles event imports for multiple calendars
   */
  private assembleIncrementalEventImports(
    userId: string,
    eventSyncPayloads: Schema_Sync["google"]["events"],
  ) {
    const syncEvents = eventSyncPayloads.map((eventSync) =>
      this.importEventsByCalendar(
        userId,
        eventSync.gCalendarId,
        eventSync.nextSyncToken,
      ),
    );

    return syncEvents;
  }

  private async categorizeGevents(
    userId: string,
    gCalendarId: string,
    updatedEvents: gSchema$Event[],
  ): Promise<EventsToModify> {
    const { toUpdate, toDelete } = organizeGcalEventsByType(updatedEvents);

    const recurringEvents = await this.expandRecurringEvents(
      userId,
      gCalendarId,
      toUpdate.recurring,
    );

    const regularEvents = MapEvent.toCompass(
      userId,
      toUpdate.nonRecurring,
      Origin.GOOGLE_IMPORT,
    );

    const toUpdateCombined = [...regularEvents, ...recurringEvents];

    return {
      toUpdate: toUpdateCombined,
      toDelete,
    };
  }

  /**
   * Fetches all instances of a recurring event series and returns them as Compass events
   */
  private async expandRecurringEvent(
    userId: string,
    calendarId: string,
    recurringEventId: string,
  ): Promise<Schema_Event_Core[]> {
    // const timeMin = new Date().toISOString();
    // const timeMax = dayjs().add(6, "months").toISOString();

    const { data } = await gcalService.getEventInstances(
      this.gcal,
      calendarId,
      recurringEventId,
      // timeMin,
      // timeMax,
    );
    const instances = data?.items;

    if (!instances) {
      logger.warn(
        `No instances found for recurring event ${recurringEventId} in calendar ${calendarId}`,
      );
      return [];
      // TODO Cleanup if not needed
      // throw error(
      //   EventError.NoGevents,
      //   "No instances found for recurring event",
      // );
    }

    // Potential Optimization: Check here if the first instance matches the base start time
    // if you also fetch the base event details. However, this function is primarily used
    // by the incremental sync (`categorizeGevents`), which seems to handle base vs instance separately.
    // The fix for importAllEvents is applied directly within that function.
    return MapEvent.toCompass(userId, instances, Origin.GOOGLE_IMPORT);
  }

  private async expandRecurringEvents(
    userId: string,
    calendarId: string,
    recurringEvents: gSchema$Event[],
  ): Promise<Schema_Event_Core[]> {
    const expandedEvents: Schema_Event_Core[] = [];

    for (const event of recurringEvents) {
      // This logic seems designed for incremental updates (syncToken based)
      // where 'recurringEvents' might contain both base events and modified instances.

      // If it's a base event with recurrence rules, map it directly.
      // This assumes `organizeGcalEventsByType` correctly identifies these.
      if (event.recurrence && event.id) {
        const baseEvent = MapEvent.toCompass(
          userId,
          [event],
          Origin.GOOGLE_IMPORT,
        );
        expandedEvents.push(...baseEvent);
        logger.debug(
          `Mapped base recurring event ${event.id} from incremental update.`,
        );
        continue;
      }

      // If it's an updated *instance* of a recurring event (no .recurrence but has .recurringEventId)
      // The current logic expands ALL instances based on the ID, which might be inefficient
      // if only one instance changed. However, the Google sync token *should* only return
      // the changed instance. Let's assume `organizeGcalEventsByType` puts individual
      // modified instances into `toUpdate.nonRecurring` or handles them appropriately.
      // This block might need review depending on how `organizeGcalEventsByType` works.
      // If an event here *doesn't* have `event.recurrence` but *does* have `recurringEventId`,
      // it's likely an individual instance received from the sync feed.
      if (event.recurringEventId && event.id) {
        const singleInstance = MapEvent.toCompass(
          userId,
          [event],
          Origin.GOOGLE_IMPORT,
        );
        expandedEvents.push(...singleInstance);
        logger.debug(
          `Mapped single instance ${event.id} (from base ${event.recurringEventId}) from incremental update.`,
        );
        continue;
      }

      // Fallback/Error case: If it's marked recurring but lacks necessary info
      const recurringId = event.recurringEventId || event.id;
      if (!recurringId) {
        // logger.error(
        //   "Recurring event received via sync is missing ID and recurringEventId.",
        //   { eventSummary: event.summary },
        // );
        // continue;
        throw error(
          EventError.MissingProperty,
          "Recurring event not expanded due to missing recurrence id",
        );
      }
      // This part might be unreachable if the above conditions handle all cases.
      // If reached, it implies fetching all instances, which might be wrong for incremental sync.
      logger.warn(
        `Unexpectedly expanding all instances for ${recurringId} during incremental sync. Review logic if this occurs frequently.`,
      );
      const instances = await this.expandRecurringEvent(
        userId,
        calendarId,
        recurringId,
      );
      expandedEvents.push(...instances);
    }

    return expandedEvents;
  }

  /**
   * Gets the appropriate sync token for the current operation (incremental sync)
   */
  private getSyncToken(
    pageToken: string | null | undefined,
    syncToken: string | null | undefined,
  ) {
    if (pageToken !== undefined && pageToken !== null) {
      return pageToken;
    }
    if (syncToken === undefined || syncToken === null) {
      throw error(
        GenericError.DeveloperError,
        "Incremental sync failed because no sync token was found",
      );
    }
    return syncToken;
  }

  /**
   * Fetches updated events from Google Calendar using a sync token (for incremental sync)
   */
  private async getUpdatedEvents(gCalendarId: string, syncToken: string) {
    // This function is specifically for *incremental* sync
    const response = await gcalService.getEvents(this.gcal, {
      calendarId: gCalendarId,
      syncToken, // Use syncToken for incremental updates
    });

    // 410 Gone status indicates the sync token is invalid and a full sync is needed.
    // This needs to be handled by the caller (e.g., importEventsByCalendar)
    if (response === null) {
      // This can happen if gcalService returns null on specific errors (e.g., 410 Gone)
      logger.warn(
        `Received null response fetching updates for calendar ${gCalendarId} with syncToken. Possible 410 Gone.`,
      );
      throw error(
        SyncError.AccessRevoked,
        "Couldn't get updated events, sync token probably invalid",
      );
    }

    if (!response) {
      // Should ideally not happen if null is handled above, but keep for safety.
      throw error(
        SyncError.NoEventChanges,
        "Import ignorede due to no response from gcal",
      );
    }

    logger.debug(
      // `++ Fetched updated events (syncToken: ${syncToken ? "..." : "N/A"}, pageToken: N/A) for ${gCalendarId}`, // Don't log full sync token
      JSON.stringify(response.data, null, 2), // Avoid logging potentially large data unless debugging verbosely
    );
    return response.data;
  }

  /**
   * Imports ALL events for a calendar (Full Sync).
   */
  public async importAllEvents(userId: string, calendarId: string) {
    logger.info(
      `Starting importAllEvents for user ${userId}, calendar ${calendarId}.`,
    );

    // Shared state needed by both passes
    const sharedState: ImportAllSharedState = {
      baseEventStartTimes: new Map<string, string | null>(),
      processedEventIdsPass1: new Set<string>(),
    };

    // --- Define Processor Logic for Each Pass ---

    // Processor for Pass 1: Identifies base/single events, updates shared state
    const processEventPass1: EventProcessorCallback = (event, state) => {
      if (event.id) {
        if (event.recurrence) {
          const startTime = getStartTimeString(event);
          state.baseEventStartTimes.set(event.id, startTime);
          state.processedEventIdsPass1.add(event.id);
          // logger.debug(`Pass 1: Identified base event ${event.id}`); // Reduce noise
          return true; // Save base event
        } else if (!event.recurringEventId) {
          state.processedEventIdsPass1.add(event.id);
          // logger.debug(`Pass 1: Identified single event ${event.id}`); // Reduce noise
          return true; // Save single event
        }
      }
      return false; // Don't save (e.g., instances encountered in Pass 1)
    };

    // Processor for Pass 2: Filters events based on shared state
    const processEventPass2: EventProcessorCallback = (event, state) => {
      // Filter 1: Skip event if already processed in Pass 1
      if (state.processedEventIdsPass1.has(event.id || "")) {
        logger.verbose(
          `Pass 2: Skipping event ${event.id} (processed in Pass 1).`,
        ); // Reduce noise
        return false; // Don't save
      }

      // Filter 2: Skip first instance if start matches base event start
      if (event.recurringEventId && event.id) {
        const baseStartTime = state.baseEventStartTimes.get(
          event.recurringEventId,
        );
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

    // --- Execute Passes using Generic Helper ---

    // Execute Pass 1
    const pass1Result = await this._fetchAndProcessEventsPageByPage(
      userId,
      calendarId,
      { singleEvents: false },
      processEventPass1,
      sharedState,
      false, // Don't capture sync token in Pass 1
    );

    // Execute Pass 2
    const pass2Result = await this._fetchAndProcessEventsPageByPage(
      userId,
      calendarId,
      { singleEvents: true }, // Pass 2 specific params
      processEventPass2, // Pass 2 specific processor
      sharedState,
      true, // Capture sync token in Pass 2
    );

    // --- Finalization ---
    const nextSyncToken = pass2Result.nextSyncToken;
    if (!nextSyncToken) {
      // If Pass 2 ran but yielded no sync token (e.g., empty calendar or API issue on last page)
      throw error(
        GcalError.NoSyncToken,
        `Failed to finalize full import because nextSyncToken was not found for ${calendarId}. Incremental sync may not work correctly.`,
      );
    }

    const baseEventsSavedCount = pass1Result.savedCount;
    const instanceEventsSavedCount = pass2Result.savedCount;
    const totalChanged = baseEventsSavedCount + instanceEventsSavedCount;
    const totalProcessed =
      pass1Result.processedCount + pass2Result.processedCount;

    logger.info(
      `importAllEvents completed for ${calendarId}. Total API events processed: ${totalProcessed}. Total base/single saved in Pass 1: ${baseEventsSavedCount}, Total new instances/single saved in Pass 2: ${instanceEventsSavedCount}. Total Saved/Changed: ${totalChanged}. Final nextSyncToken acquired.`,
    );

    return {
      totalProcessed,
      totalChanged,
      nextSyncToken,
    };
  }

  /**
   * Imports the latest events for a user using incremental sync
   */
  public async importLatestEvents(userId: string) {
    const eventSyncPayloads = await this.prepIncrementalImport(userId);
    if (eventSyncPayloads.length === 0) {
      logger.info(
        `No calendars configured or ready for incremental sync for user ${userId}.`,
      );
      return []; // Return empty array if nothing to sync
    }
    const syncEvents = this.assembleIncrementalEventImports(
      userId,
      eventSyncPayloads,
    );

    const result = await Promise.all(syncEvents);
    return result;
  }

  /**
   * Prepares for incremental import of events by ensuring sync records and watch channels exist.
   */
  private async prepIncrementalImport(userId: string) {
    const { gCalendarIds, calListNextSyncToken } = await getCalendarsToSync(
      userId,
      this.gcal,
    );

    const sync = await getSync({ userId });
    if (!sync) {
      throw error(
        SyncError.NoSyncRecordForUser,
        "Prepping for incremental import failed",
      );
    }

    const noRefreshNeeded =
      sync !== null &&
      sync.google.events.length > 0 &&
      hasAnyActiveEventSync(sync) &&
      sync.google.calendarlist.length === gCalendarIds.length;
    if (noRefreshNeeded) {
      return sync.google.events;
    }

    if (!isUsingHttps()) {
      logger.warn(
        `Skipped gcal watch during incremental import because BASEURL does not use HTTPS: '${
          ENV.BASEURL || ""
        }'`,
      );
      return sync.google.events;
    }

    await updateSyncTokenFor("calendarlist", userId, calListNextSyncToken);
    const eventWatchPayloads = assembleEventWatchPayloads(
      sync as Schema_Sync,
      gCalendarIds,
    );
    await syncService.startWatchingGcalEventsById(
      userId,
      eventWatchPayloads, // Watch all selected calendars
      this.gcal,
    );
    const newSync = (await getSync({ userId })) as Schema_Sync;

    return newSync.google.events;
  }

  /**
   * Process updates for a calendar, handling pagination and event processing
   */
  public async importEventsByCalendar(
    userId: string,
    gCalendarId: string,
    initialSyncToken: string,
  ) {
    let nextSyncToken: string | null | undefined = initialSyncToken;
    let nextPageToken: string | null | undefined = undefined;
    let totalUpdated = 0;
    let totalDeleted = 0;
    let totalCreated = 0;
    do {
      const syncToken = this.getSyncToken(nextPageToken, nextSyncToken);
      const response = await this.getUpdatedEvents(gCalendarId, syncToken);
      const updatedEvents = response.items || [];

      if (updatedEvents.length === 0) {
        return { created: 0, updated: 0, deleted: 0, nextSyncToken };
      }

      const eventsToModify = await this.categorizeGevents(
        userId,
        gCalendarId,
        updatedEvents,
      );

      const { created, updated, deleted } = await this.updateDatabase(
        userId,
        eventsToModify,
      );

      totalUpdated += updated;
      totalDeleted += deleted;
      totalCreated += created;
      nextSyncToken = response.nextSyncToken;
      nextPageToken = response.nextPageToken;
    } while (nextPageToken !== undefined);

    if (!nextSyncToken) {
      throw error(
        GcalError.NoSyncToken,
        `Import finished for calendar: ${gCalendarId}, but failed to get final sync token.`,
      );
    }

    await updateSync(userId, gCalendarId, initialSyncToken, nextSyncToken);
    return {
      updated: totalUpdated,
      deleted: totalDeleted,
      created: totalCreated,
      nextSyncToken,
    };
  }

  /**
   * Update database with processed events (Create, Update, Delete)
   */
  private async updateDatabase(userId: string, events: EventsToModify) {
    const { toDelete, toUpdate } = events;
    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Handle deletions
    if (toDelete.length > 0) {
      const deleteResult = await mongoService.db
        .collection(Collections.EVENT)
        .deleteMany({
          user: userId,
          gEventId: { $in: toDelete },
        });
      deleted = deleteResult.deletedCount || 0;
    }

    // Handle updates/creations (Upserts)
    if (toUpdate.length > 0) {
      //TODO delete
      // First check what documents exist
      // const existingDocs = await mongoService.db
      //   .collection(Collections.EVENT)
      //   .find({
      //     user: userId,
      //     gEventId: { $in: toUpdate.map((e) => e["gEventId"]) },
      //   })
      //   .toArray();

      // console.log(`Found ${existingDocs.length} existing events`);
      // console.log(
      //   `Existing event IDs: ${existingDocs.map((e) => e["gEventId"]).join(", ")}`,
      // );

      const bulkOps = toUpdate.map((event) => ({
        updateOne: {
          filter: {
            user: userId,
            gEventId: event["gEventId"],
          },
          update: { $set: event },
          upsert: true,
        },
      }));

      const result = await mongoService.db
        .collection(Collections.EVENT)
        .bulkWrite(bulkOps);

      //TODo delete
      // console.log(
      //   `Bulk write result: ${JSON.stringify(
      //     {
      //       modifiedCount: result.modifiedCount,
      //       upsertedCount: result.upsertedCount,
      //       matchedCount: result.matchedCount,
      //       upsertedIds: result.upsertedIds,
      //     },
      //     null,
      //     2,
      //   )}`,
      // );

      // For upserts:
      // - modifiedCount: number of existing documents that were updated
      // - upsertedCount: number of documents that were inserted because they didn't exist
      updated = result.modifiedCount || 0;
      created = result.upsertedCount || 0;
    }

    return { updated, deleted, created };
  }

  // ================================================================
  // Generic Helper Method for Page-by-Page Fetching and Processing (for importAllEvents)
  // ================================================================

  /**
   * Generic helper: Fetches events page by page, processes using a callback, and saves.
   * @private
   */
  private async _fetchAndProcessEventsPageByPage(
    userId: string,
    calendarId: string,
    // Parameters specific to the Google API call (beyond pagination)
    gcalApiParams: {
      singleEvents: boolean;
      timeMin?: string;
      timeMax?: string;
      // Add other relevant gParamsImportAllEvents fields if needed
    },
    // Callback function to process each event and decide if it should be saved
    eventProcessor: EventProcessorCallback,
    // Shared state accessible/modifiable by the processor
    sharedState: ImportAllSharedState,
    // Flag to indicate if the nextSyncToken should be captured
    captureSyncToken: boolean,
  ): Promise<{
    savedCount: number;
    processedCount: number;
    nextSyncToken: string | undefined;
  }> {
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

      const gEventsResponse = await gcalService.getEvents(this.gcal, params);

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
  }
}

// Factory function to create instances
export const createSyncImport = async (id: string | gCalendar) => {
  const gcal = typeof id === "string" ? await getGcalClient(id) : id;
  return new SyncImport(gcal);
};
