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
import { Resource_Sync, SyncDetails } from "@core/types/sync.types";
import { isBaseGCalEvent } from "@core/util/event/gcal.event.util";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Collections } from "@backend/common/constants/collections";
import { ENV } from "@backend/common/constants/env.constants";
import { EventError } from "@backend/common/errors/event/event.errors";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { EventsToModify } from "@backend/sync/services/import/sync.import.types";
import { organizeGcalEventsByType } from "@backend/sync/services/import/sync.import.util";
import { getCalendarsToSync } from "@backend/sync/services/init/sync.init";
import syncService from "@backend/sync/services/sync.service";
import {
  getGCalEventsSyncPageToken,
  getSync,
  updateSync,
} from "@backend/sync/util/sync.queries";
import { isUsingHttps } from "@backend/sync/util/sync.util";

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
  private async assembleIncrementalEventImports(
    userId: string,
    eventSyncPayloads: SyncDetails[],
    perPage = 1000,
  ) {
    const syncEvents = await Promise.all(
      eventSyncPayloads.map((eventSync) =>
        this.importEventsByCalendar(
          userId,
          eventSync.gCalendarId,
          eventSync.nextSyncToken,
          perPage,
        ),
      ),
    );

    return syncEvents;
  }

  private async fetchAndCategorizeEventsToModify(
    userId: string,
    gCalendarId: string,
    updatedEvents: gSchema$Event[],
    perPage = 1000,
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
      perPage,
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
    calendarId: string,
    recurringEventId: string,
    perPage = 1000,
  ): Promise<gSchema$Event[]> {
    const instances: gSchema$Event[] = [];

    const gCalResponse = gcalService.getBaseRecurringEventInstances({
      gCal: this.gcal,
      calendarId,
      eventId: recurringEventId,
      maxResults: perPage,
    });

    for await (const { items = [] } of gCalResponse) {
      instances.push(...items);
    }

    if (instances.length === 0) {
      logger.warn(
        `No instances found for recurring event ${recurringEventId} in calendar ${calendarId}`,
      );
    }

    return instances;
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
    perPage = 1000,
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
        calendarId,
        baseId,
        perPage,
      );

      const compassInstances = MapEvent.toCompass(
        userId,
        instances,
        Origin.GOOGLE_IMPORT,
      ) as WithCompassId<Schema_Event_Recur_Instance>[];

      baseAndInstances.push(...compassInstances);
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
  private async getUpdatedEvents(
    gCalendarId: string,
    syncToken: string,
    perPage = 1000,
  ) {
    // This function is specifically for *incremental* sync
    const response = await gcalService.getEvents(this.gcal, {
      calendarId: gCalendarId,
      syncToken, // Use syncToken for incremental updates
      maxResults: perPage,
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

    return response.data;
  }

  async importEventInstances(
    userId: string,
    calendarId: string,
    event: gSchema$Event,
    perPage = 1000,
    session?: ClientSession,
  ): Promise<{
    totalProcessed: number;
    totalSaved: number;
    totalInstancesSaved: number;
  }> {
    const isBaseEvent = isBaseGCalEvent(event);

    const sync = isBaseEvent
      ? await this.importSeries(
          userId,
          calendarId,
          event as gSchema$EventBase,
          session,
          perPage,
        )
      : await this.syncEvent(userId, event, session);

    return {
      totalProcessed: sync.totalProcessed,
      totalSaved: sync.totalSaved,
      totalInstancesSaved: Math.max(sync.totalInstancesSaved - 1, 0),
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
  public async importLatestEvents(userId: string, perPage = 1000) {
    const eventSyncPayloads = await this.prepIncrementalImport(userId);

    if (eventSyncPayloads === undefined || eventSyncPayloads.length === 0) {
      logger.info(
        `No calendars configured or ready for incremental sync for user ${userId}.`,
      );

      return []; // Return empty array if nothing to sync
    }

    const result = await this.assembleIncrementalEventImports(
      userId,
      eventSyncPayloads,
      perPage,
    );

    return result;
  }

  public async syncEvent(
    userId: string,
    gEvent: gSchema$Event,
    session?: ClientSession,
  ): Promise<{
    totalProcessed: number;
    totalSaved: number;
    totalInstancesSaved: number;
    upsertedId?: ObjectId;
  }> {
    // assemble event
    const event = MapEvent.toCompass(
      userId,
      [gEvent],
      Origin.GOOGLE_IMPORT,
    )[0] as WithoutCompassId<Schema_Event_Recur_Base>;

    if (!event) {
      return { totalProcessed: 1, totalInstancesSaved: 0, totalSaved: 0 };
    }

    const cEvent = await mongoService.event.findOneAndUpdate(
      { gEventId: event.gEventId, user: userId },
      { $set: event },
      { upsert: true, session, returnDocument: "after" },
    );

    if (!cEvent?._id) throw error(GenericError.NotSure, "Event import failed");

    return {
      totalProcessed: 1,
      totalInstancesSaved: 0,
      totalSaved: 1,
      upsertedId: cEvent._id,
    };
  }

  public async importSeries(
    userId: string,
    calendarId: string,
    baseEvent: gSchema$EventBase,
    session?: ClientSession,
    perPage = 1000,
  ): Promise<{
    totalProcessed: number;
    totalSaved: number;
    totalInstancesSaved: number;
  }> {
    // assemble base event
    const baseImport = await this.syncEvent(userId, baseEvent, session);
    const baseId = baseImport?.upsertedId;

    if (!baseId) return baseImport;

    // assemble instances
    const instances = await this.expandRecurringEvent(
      calendarId,
      baseEvent.id,
      perPage,
    );

    if (instances.length === 0) return baseImport;

    const cInstances = MapEvent.toCompass(
      userId,
      instances,
      Origin.GOOGLE_IMPORT,
    );

    const bulkUpsert = mongoService.event.initializeUnorderedBulkOp();

    cInstances.forEach((event) => {
      bulkUpsert
        .find({ gEventId: event.gEventId, user: userId })
        .upsert()
        .update({
          $set: {
            ...event,
            recurrence: { eventId: baseId.toString() },
            updatedAt: new Date(),
          },
        });
    });

    const result = await bulkUpsert.execute({ session });

    return {
      totalProcessed: baseImport.totalProcessed + instances.length,
      totalInstancesSaved: result.upsertedCount + result.insertedCount,
      totalSaved:
        baseImport.totalSaved + result.upsertedCount + result.insertedCount,
    };
  }

  /**
   * Prepares for incremental import of events by ensuring sync records and watch channels exist.
   */
  private async prepIncrementalImport(userId: string) {
    const sync = await getSync({ userId });

    if (!sync) {
      throw error(
        SyncError.NoSyncRecordForUser,
        "Prepping for incremental import failed",
      );
    }

    if (!isUsingHttps()) {
      logger.warn(
        `Skipped gcal watch during incremental import because BASEURL does not use HTTPS: '${
          ENV.BASEURL || ""
        }'`,
      );

      return sync.google?.events;
    }

    const { gCalendarIds, nextSyncToken } = await getCalendarsToSync(this.gcal);

    await updateSync(
      Resource_Sync.CALENDAR,
      userId,
      Resource_Sync.CALENDAR,
      { nextSyncToken },
      undefined,
    );

    await syncService.startWatchingGcalResources(
      userId,
      [
        ...gCalendarIds.map((gCalendarId) => ({ gCalendarId })),
        { gCalendarId: Resource_Sync.CALENDAR },
      ], // Watch all selected calendars and calendar list
      this.gcal,
    );

    const updatedSync = await getSync({ userId });

    if (!updatedSync) {
      throw error(
        SyncError.NoSyncRecordForUser,
        "Prepping for incremental import failed",
      );
    }

    return updatedSync.google?.events;
  }

  /**
   * Process updates for a calendar, handling pagination and event processing
   */
  public async importEventsByCalendar(
    userId: string,
    gCalendarId: string,
    initialSyncToken?: string | null,
    perPage = 1000,
  ) {
    let nextSyncToken: string | null | undefined = initialSyncToken;
    let nextPageToken: string | null | undefined = undefined;
    let totalUpdated = 0;
    let totalDeleted = 0;
    let totalCreated = 0;
    do {
      const syncToken = this.getSyncToken(nextPageToken, nextSyncToken);

      const response = await this.getUpdatedEvents(
        gCalendarId,
        syncToken,
        perPage,
      );

      const updatedEvents = response.items || [];

      if (updatedEvents.length === 0) {
        return { created: 0, updated: 0, deleted: 0, nextSyncToken };
      }

      const eventsToModify = await this.fetchAndCategorizeEventsToModify(
        userId,
        gCalendarId,
        updatedEvents,
        perPage,
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
