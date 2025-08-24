import { ClientSession, ObjectId } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
import {
  RecurrenceWithoutId,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
  WithCompassId,
  WithoutCompassId,
} from "@core/types/event.types";
import { gCalendar, gSchema$Event, gSchema$EventBase } from "@core/types/gcal";
import { Resource_Sync, Schema_Sync } from "@core/types/sync.types";
import { isBaseGCalEvent } from "@core/util/event/gcal.event.util";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Collections } from "@backend/common/constants/collections";
import { ENV } from "@backend/common/constants/env.constants";
import { EventError } from "@backend/common/errors/event/event.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import { EventsToModify } from "@backend/sync/services/import/sync.import.types";
import {
  assignIdsToEvents,
  organizeGcalEventsByType,
} from "@backend/sync/services/import/sync.import.util";
import { getCalendarsToSync } from "@backend/sync/services/init/sync.init";
import syncService from "@backend/sync/services/sync.service";
import { assembleEventWatchPayloads } from "@backend/sync/services/watch/sync.watch";
import {
  getGCalEventsSyncPageToken,
  getSync,
  updateSync,
} from "@backend/sync/util/sync.queries";
import {
  hasAnyActiveEventSync,
  isUsingHttps,
} from "@backend/sync/util/sync.util";

const logger = Logger("app:sync.import");

export type WithCompassObjectId<T> = Omit<T, "_id"> & { _id: ObjectId };

export type RecurrenceWithObjectId =
  | WithCompassObjectId<Schema_Event_Recur_Instance>
  | WithCompassObjectId<Schema_Event_Recur_Base>;

export class SyncImport {
  private gcal: gCalendar;
  // TODO make userid constructor

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

  private async fetchAndCategorizeEventsToModify(
    userId: string,
    gCalendarId: string,
    updatedEvents: gSchema$Event[],
  ): Promise<EventsToModify> {
    const { toUpdate, toDelete } = organizeGcalEventsByType(updatedEvents);

    const regularEvents = MapEvent.toCompass(
      userId,
      toUpdate.nonRecurring,
      Origin.GOOGLE_IMPORT,
    );
    const recurringEvents = await this.expandRecurringEvents(
      userId,
      gCalendarId,
      toUpdate.recurring,
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
  ): Promise<WithoutCompassId<Schema_Event_Recur_Instance>[]> {
    const { data } = await gcalService.getEventInstances(
      this.gcal,
      calendarId,
      recurringEventId,
    );
    const instances = data?.items;

    if (!instances) {
      logger.warn(
        `No instances found for recurring event ${recurringEventId} in calendar ${calendarId}`,
      );
      return [];
    }

    const compassInstances = MapEvent.toCompass(
      userId,
      instances,
      Origin.GOOGLE_IMPORT,
    ) as WithCompassId<Schema_Event_Recur_Instance>[];
    return compassInstances;
  }

  /**
   * Expands recurring events and returns the base and instances
   * @param userId - The user ID
   * @param calendarId - The calendar ID
   * @param recurringEvents - A *subset* of therecurring events to expand
   * @returns The base and instances, including *all* expanded instances
   */

  private async expandRecurringEvents(
    userId: string,
    calendarId: string,
    recurringEvents: gSchema$Event[],
  ): Promise<RecurrenceWithoutId[]> {
    const baseAndInstances: RecurrenceWithoutId[] = [];

    for (const event of recurringEvents) {
      const isBase = event.recurrence && event.id;
      if (isBase) {
        const baseEvent = MapEvent.toCompass(
          userId,
          [event],
          Origin.GOOGLE_IMPORT,
        )[0] as WithoutCompassId<Schema_Event_Recur_Base>;
        baseAndInstances.push(baseEvent);
        logger.debug(`Found base event during expansion ${event.id}`);
        continue;
      }

      const isInstance = event.recurringEventId && event.id;
      if (isInstance) {
        const singleInstance = MapEvent.toCompass(
          userId,
          [event],
          Origin.GOOGLE_IMPORT,
        ) as WithoutCompassId<Schema_Event_Recur_Instance>[];
        baseAndInstances.push(...singleInstance);
        logger.debug(
          `Mapped single instance ${event.id} (from base ${event.recurringEventId}) from incremental update.`,
        );
        continue;
      }

      // Fallback/Error case: If it's marked recurring but lacks necessary info
      const baseId = event.recurringEventId || event.id;
      if (!baseId) {
        throw error(
          EventError.MissingProperty,
          "Recurring event not expanded due to missing recurrence id",
        );
      }

      const instances = await this.expandRecurringEvent(
        userId,
        calendarId,
        baseId,
      );
      baseAndInstances.push(...instances);
    }

    return baseAndInstances;
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
        SyncError.NoSyncToken,
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
      throw error(
        SyncError.NoEventChanges,
        "Import ignored due to no response from gcal",
      );
    }

    logger.debug(
      JSON.stringify(response.data, null, 2), // TODO cleanup after testing
    );
    return response.data;
  }

  async importEventInstances(
    userId: string,
    calendarId: string,
    baseEvent: gSchema$Event,
    perPage = 1000,
    session?: ClientSession,
  ): Promise<{
    totalProcessed: number;
    totalSaved: number;
    totalInstancesSaved: number;
  }> {
    const isBaseEvent = isBaseGCalEvent(baseEvent);
    const instances: gSchema$Event[] = [baseEvent];

    if (isBaseEvent) {
      const gCalResponse = gcalService.getBaseRecurringEventInstances({
        gCal: this.gcal,
        calendarId,
        eventId: baseEvent.id!,
        maxResults: perPage,
      });

      for await (const { items = [] } of gCalResponse) {
        instances.push(...items);
      }
    }

    const cEvents = MapEvent.toCompass(userId, instances, Origin.GOOGLE_IMPORT);

    const compassSeries = assignIdsToEvents(cEvents);

    let insertedCount = 0;

    if (compassSeries.length > 0) {
      const createResponse = await eventService.createMany(
        compassSeries,
        {
          stripIds: false, // Preserve our generated ids in order to match the gcal ids
        },
        session,
      );

      insertedCount = createResponse.insertedCount;
    }

    return {
      totalProcessed: instances.length,
      totalSaved: insertedCount,
      totalInstancesSaved: Math.max(insertedCount - 1, 0),
    };
  }

  /**
   * importAllEvents
   * Import ALL events for a calendar (Full Sync).
   */
  async importAllEvents(
    userId: string,
    calendarId: string,
    perPage = 1000,
    session?: ClientSession,
  ): Promise<{
    totalProcessed: number;
    totalBaseEventsChanged: number;
    totalChanged: number;
    nextSyncToken: string;
  }> {
    logger.info(
      `Starting importAllEvents for user ${userId}, calendar ${calendarId}.`,
    );

    const startTime = performance.now();

    let syncToken: string | undefined = undefined;

    const stats: {
      totalProcessed: number;
      totalBaseEventsChanged: number;
      totalChanged: number;
    } = {
      totalProcessed: 0,
      totalBaseEventsChanged: 0,
      totalChanged: 0,
    };

    const pageToken = await getGCalEventsSyncPageToken(
      userId,
      calendarId,
      session,
    );

    const gCalResponse = gcalService.getAllEvents({
      gCal: this.gcal,
      calendarId,
      maxResults: perPage,
      syncToken,
      pageToken: pageToken ?? undefined,
    });

    for await (const {
      items = [],
      nextSyncToken,
      nextPageToken,
    } of gCalResponse) {
      await Promise.allSettled(
        items.map(async (baseEvent) => {
          const instanceStats = await this.importEventInstances(
            userId,
            calendarId,
            baseEvent,
            perPage,
            session,
          );

          const totalBaseEventsSaved =
            instanceStats.totalSaved - instanceStats.totalInstancesSaved;

          stats.totalChanged += instanceStats.totalSaved;
          stats.totalProcessed += instanceStats.totalProcessed;
          stats.totalBaseEventsChanged += totalBaseEventsSaved;
        }),
      );

      await updateSync(
        Resource_Sync.EVENTS,
        userId,
        calendarId,
        { nextPageToken: nextPageToken ?? undefined },
        session,
      );

      if (nextSyncToken) syncToken = nextSyncToken;
    }

    if (!syncToken) {
      // If no sync token (e.g., empty calendar or sync did not reach last page)
      throw error(
        GcalError.NoSyncToken,
        `Failed to finalize full import because nextSyncToken was not found for ${calendarId}. Incremental sync may not work correctly.`,
      );
    }

    const baseEventsSavedCount = stats.totalBaseEventsChanged;
    const instanceEventsSavedCount = stats.totalChanged - baseEventsSavedCount;
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    logger.info(
      `importAllEvents completed for ${calendarId}.
    Max results / page: ${perPage}
    Total GCal events processed: ${stats.totalProcessed}.
    Total base/single saved: ${baseEventsSavedCount},
    Total instances saved: ${instanceEventsSavedCount}.
    Total Saved/Changed Compass Events: ${stats.totalChanged}.
    Duration: ${duration.toFixed(2)}s
    Final nextSyncToken acquired.`,
    );

    return { ...stats, nextSyncToken: syncToken };
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

  public async importSeries(
    userId: string,
    calendarId: string,
    gEvent: gSchema$EventBase,
    excludeBase = false,
    session?: ClientSession,
  ) {
    // assemble base event
    const cBase = MapEvent.toCompass(
      userId,
      [gEvent],
      Origin.GOOGLE_IMPORT,
    )[0] as WithoutCompassId<Schema_Event_Recur_Base>;

    // assemble instances
    const recurringId = gEvent.id;
    const cInstances = await this.expandRecurringEvent(
      userId,
      calendarId,
      recurringId,
    );

    const series = excludeBase ? cInstances : [cBase, ...cInstances];

    // assign ids and link instances to base
    const compassSeries = assignIdsToEvents(series);

    const result = await mongoService.event.insertMany(compassSeries, {
      session,
    });

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

    await updateSync(
      Resource_Sync.CALENDAR,
      userId,
      sync.google.calendarlist[0]!.gCalendarId,
      { nextSyncToken: calListNextSyncToken },
      undefined,
    );

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
    initialSyncToken?: string | null,
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

      const eventsToModify = await this.fetchAndCategorizeEventsToModify(
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

    const syncToken = nextSyncToken ?? initialSyncToken;

    await updateSync(
      Resource_Sync.EVENTS,
      userId,
      gCalendarId,
      syncToken ? { nextSyncToken: syncToken } : {},
    );

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
