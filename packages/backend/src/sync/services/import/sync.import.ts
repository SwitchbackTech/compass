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
import { EventsToModify } from "./sync.import.types";
import { organizeGcalEventsByType } from "./sync.import.util";

const logger = Logger("app:sync.import");

// Helper function to get a consistent start time string from a Google Event
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
      // It might be valid for a recurring event to have no instances in the time range
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
          [event], // Map just this one event
          Origin.GOOGLE_IMPORT,
        );
        expandedEvents.push(...baseEvent);
        logger.debug(
          `Mapped base recurring event ${event.id} from incremental update.`,
        );
        // We don't expand instances here because the sync logic assumes
        // that modified *instances* will also appear in the `updatedEvents` list
        // if they were changed individually. Fetching all instances here could be redundant
        // or conflict with specific instance updates received via syncToken.
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
        // Map this single instance directly, as it represents a specific change.
        const singleInstance = MapEvent.toCompass(
          userId,
          [event], // Map just this one instance
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
        `Unexpectedly expanding all instances for ${recurringId} during incremental sync. Review logic.`,
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
   * Gets the appropriate sync token for the current operation
   */
  private getSyncToken(
    pageToken: string | null | undefined,
    syncToken: string | null | undefined,
  ) {
    // Incremental sync uses syncToken first, then pageToken for subsequent pages of that sync result
    if (pageToken !== undefined && pageToken !== null) {
      // When paging through results from a previous syncToken request
      return pageToken;
    }

    if (syncToken === undefined || syncToken === null) {
      // Should not happen if called from importEventsByCalendar which provides initialSyncToken
      throw error(
        GenericError.DeveloperError,
        "Incremental sync failed because no sync token was found",
      );
    }
    // First call for an incremental sync uses the stored syncToken
    return syncToken;
  }

  /**
   * Fetches updated events from Google Calendar using a sync token
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
    let nextPageToken: string | undefined = undefined;
    let nextSyncToken: string | undefined = undefined;
    let totalProcessed = 0; // Track total events processed across passes
    let baseEventsSavedCount = 0;
    let instanceEventsSavedCount = 0;

    // Store base event IDs and their start times (for first instance check)
    const baseEventStartTimes = new Map<string, string | null>();

    // Store IDs of ALL events processed in Pass 1
    const processedEventIdsPass1 = new Set<string>();

    logger.info(
      `Starting importAllEvents for user ${userId}, calendar ${calendarId}. Pass 1: Fetching base recurring & single events.`, // Log reflects scope
    );

    // Pass 1: Fetch with singleEvents: false
    do {
      const params: gParamsImportAllEvents = {
        calendarId,
        singleEvents: false, // Get master recurring events
        pageToken: nextPageToken,
        maxResults: 250, // Fetch in reasonable batches
      };

      const gEventsResponse = await gcalService.getEvents(this.gcal, params);

      if (!gEventsResponse || !gEventsResponse.data.items) {
        logger.warn(
          `No events found or error fetching base events page for calendar ${calendarId}. PageToken: ${nextPageToken}`,
        );
        if (!nextPageToken && totalProcessed === 0) {
          throw error(
            EventError.NoGevents,
            `Initial fetch for base events failed for calendar ${calendarId}`,
          );
        }
        break;
      }

      const eventsFromPass1 = gEventsResponse.data.items;
      totalProcessed += eventsFromPass1.length;

      if (eventsFromPass1.length > 0) {
        const eventsToSavePass1: gSchema$Event[] = [];
        eventsFromPass1.forEach((event) => {
          if (event.id && event.recurrence) {
            // It's a base recurring event, store its ID and start time
            const startTime = getStartTimeString(event);
            baseEventStartTimes.set(event.id, startTime);
            eventsToSavePass1.push(event);
            processedEventIdsPass1.add(event.id);
            logger.debug(
              `Pass 1: Identified base event ${event.id}, start: ${startTime}`,
            );
          } else if (event.id && !event.recurringEventId) {
            // It's a regular single event
            eventsToSavePass1.push(event);
            processedEventIdsPass1.add(event.id);
            logger.debug(`Pass 1: Identified single event ${event.id}`);
          }
          // Ignore detached instances in this pass
        });

        if (eventsToSavePass1.length > 0) {
          const cEvents = MapEvent.toCompass(
            userId,
            eventsToSavePass1,
            Origin.GOOGLE_IMPORT,
          );
          if (cEvents.length > 0) {
            const result = await eventService.createMany(cEvents);
            baseEventsSavedCount += result.insertedCount;
            logger.debug(
              `Saved ${result.insertedCount || 0} base/single events from Pass 1.`,
            );
          }
        }
      }

      nextPageToken = gEventsResponse.data.nextPageToken ?? undefined;
      // Sync token from singleEvents=false is generally not useful for starting incremental sync
      // We need the one from singleEvents=true later.
      // nextSyncToken = gEventsResponse.data.nextSyncToken ?? undefined;
    } while (nextPageToken !== undefined);

    logger.info(
      `Completed Pass 1 for ${calendarId}. Processed ${totalProcessed} API events. Saved ${baseEventsSavedCount} base/single events. ${processedEventIdsPass1.size} unique events recorded from Pass 1.`,
    );

    // Reset pagination for the second fetch
    nextPageToken = undefined;

    logger.info(
      `Starting Pass 2: Fetching instances & single events within range.`,
    );

    // Pass 2: Fetch with singleEvents: true
    do {
      const params: gParamsImportAllEvents = {
        calendarId,
        singleEvents: true, // Expand recurring events into instances
        pageToken: nextPageToken,
        maxResults: 250,
        // be aware that not including timeMin/Max affects which instances/single events are fetched
      };

      const gEventsResponse = await gcalService.getEvents(this.gcal, params);

      if (!gEventsResponse || !gEventsResponse.data.items) {
        logger.warn(
          `No events found or error fetching instances page for calendar ${calendarId}. PageToken: ${nextPageToken}`,
        );
        if (!nextPageToken && instanceEventsSavedCount === 0) {
          logger.error(
            `Initial fetch for instances failed for calendar ${calendarId}. Full sync may be incomplete.`,
          );
          throw error(EventError.NoGevents, "Potentially missing events");
        }
        break;
      }

      const allItemsPass2 = gEventsResponse.data.items;
      totalProcessed += allItemsPass2.length;

      if (allItemsPass2.length > 0) {
        const instancesToSave: gSchema$Event[] = [];

        allItemsPass2.forEach((event) => {
          // --- Filter Logic ---
          // Filter 1: Skip ANY event already processed in Pass 1
          if (processedEventIdsPass1.has(event.id || "")) {
            logger.verbose(
              `Skipping event ${event.id} in Pass 2: Already processed in Pass 1.`,
            );
            return;
          }

          // Filter 2: Skip the first instance if it matches the base event's start time
          if (event.recurringEventId && event.id) {
            const baseStartTime = baseEventStartTimes.get(
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
                  `Skipping event ${event.id} (instance): Start time matches base event ${event.recurringEventId}.`,
                );
                return; // Skip: It's the first instance duplicating the base event's time
              }
            } else {
              logger.warn(
                `Instance ${event.id} found, but its base event ${event.recurringEventId} was not recorded in Pass 1. Saving instance.`,
              );
            }
          }
          // --- End Filter Logic ---

          // If not filtered out, add to the list to be saved
          instancesToSave.push(event);
        });

        if (instancesToSave.length > 0) {
          const cEvents = MapEvent.toCompass(
            userId,
            instancesToSave,
            Origin.GOOGLE_IMPORT,
          );
          if (cEvents.length > 0) {
            const result = await eventService.createMany(cEvents);
            const savedCount = result.insertedCount ?? 0;
            instanceEventsSavedCount += savedCount;
            logger.debug(
              `Saved ${savedCount} instances/single events from Pass 2.`,
            );
          }
        }
      }

      nextPageToken = gEventsResponse.data.nextPageToken ?? undefined;
      // *** CRITICAL: Get the sync token from the *last* page of the singleEvents=true fetch ***
      if (!nextPageToken) {
        nextSyncToken = gEventsResponse.data.nextSyncToken ?? undefined;
        logger.info(
          `Reached last page of instances fetch. Got nextSyncToken: ${
            nextSyncToken ? "..." : "null"
          }`,
        );
      }
    } while (nextPageToken !== undefined);

    logger.info(
      `Completed Pass 2 for ${calendarId}. Processed ${totalProcessed} API events. Saved ${instanceEventsSavedCount} new instances/single events.`, // Updated log
    );

    // A nextSyncToken is essential to start incremental sync later.
    if (!nextSyncToken) {
      // This can happen if the calendar is empty or if there was an error on the last page fetch.
      throw error(
        GcalError.NoSyncToken,
        `Failed to finalize import full import because nextSyncToken was not found for ${calendarId}. Incremental sync may not work correctly.`,
      );
    }

    const totalChanged = baseEventsSavedCount + instanceEventsSavedCount;
    logger.info(
      `importAllEvents completed for ${calendarId}. Total base/single saved in Pass 1: ${baseEventsSavedCount}, Total new instances/single saved in Pass 2: ${instanceEventsSavedCount}. Total Saved: ${totalChanged}. Final nextSyncToken acquired.`, // Updated log
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
}

// Factory function to create instances
export const createSyncImport = async (id: string | gCalendar) => {
  const gcal = typeof id === "string" ? await getGcalClient(id) : id;
  return new SyncImport(gcal);
};
