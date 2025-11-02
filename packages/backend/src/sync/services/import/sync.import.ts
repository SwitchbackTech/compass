import { ClientSession, ObjectId } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { MapGCalEvent } from "@core/mappers/map.gcal.event";
import {
  BaseEventSchema,
  EventMetadataSchema,
  EventSchema,
  InstanceEventSchema,
  Schema_Base_Event,
  Schema_Instance_Event,
} from "@core/types/event.types";
import { gCalendar, gSchema$Event, gSchema$EventBase } from "@core/types/gcal";
import { Resource_Sync, SyncDetails } from "@core/types/sync.types";
import {
  isBaseGCalEvent,
  isCancelledGCalEvent,
  isInstanceGCalEvent,
} from "@core/util/event/gcal.event.util";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { ENV } from "@backend/common/constants/env.constants";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { EventsToModify } from "@backend/sync/services/import/sync.import.types";
import { organizeGcalEventsByType } from "@backend/sync/services/import/sync.import.util";
import syncService from "@backend/sync/services/sync.service";
import {
  getGCalEventsSyncPageToken,
  getSync,
  updateSync,
} from "@backend/sync/util/sync.queries";
import { isUsingHttps } from "@backend/sync/util/sync.util";
import {
  CalendarProvider,
  CompassCalendarSchema,
  Schema_Calendar,
} from "../../../../../core/src/types/calendar.types";
import calendarService from "../../../calendar/services/calendar.service";

const logger = Logger("app:sync.import");

export type WithCompassObjectId<T> = Omit<T, "_id"> & { _id: ObjectId };

export type RecurrenceWithObjectId =
  | WithCompassObjectId<Schema_Instance_Event>
  | WithCompassObjectId<Schema_Base_Event>;

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
    userId: ObjectId,
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
    user: ObjectId,
    gCalendarId: string,
    updatedEvents: gSchema$Event[],
    perPage = 1000,
  ): Promise<EventsToModify> {
    const { toUpdate, toDelete } = organizeGcalEventsByType(updatedEvents);

    const _calendar = await calendarService.getByUserAndProvider(
      user,
      gCalendarId,
      CalendarProvider.GOOGLE,
    );

    const calendar = CompassCalendarSchema.parse(_calendar, {
      error: () => `Calendar ${gCalendarId} not found for user ${user}`,
    });

    const regularEvents = toUpdate.nonRecurring.map((event) =>
      MapGCalEvent.toEvent(event, {
        origin: Origin.GOOGLE_IMPORT,
        calendar: calendar._id,
      }),
    );

    const recurringEvents = await this.expandRecurringEvents(
      calendar._id,
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
   * getGCalRecurringEventInstances
   *
   * Fetches all instances of a recurring event series and returns them as Compass events
   *
   * @param gCalendarId the google calendar id
   * @param gRecurringEventId the google recurring event id
   * @param perPage
   * @returns
   */
  async getGCalRecurringEventInstances(
    gCalendarId: string,
    gRecurringEventId: string,
    perPage = 1000,
  ): Promise<gSchema$Event[]> {
    const instances: gSchema$Event[] = [];

    const gCalResponse = gcalService.getAllBaseEventInstances({
      gCal: this.gcal,
      gCalendarId,
      gRecurringEventId,
      maxResults: perPage,
    });

    for await (const { items = [] } of gCalResponse) {
      instances.push(...items);
    }

    if (instances.length === 0) {
      logger.warn(
        `No instances found for recurring event ${gRecurringEventId} in calendar ${gCalendarId}`,
      );
    }

    return instances;
  }

  /**
   * expandRecurringEvents
   *
   * Expands recurring events and returns the base and instances
   * @param userId - The user ID
   * @param calendarId - The calendar ID
   * @param recurringEvents - A *subset* of therecurring events to expand
   * @returns The base and instances, including *all* expanded instances
   */

  private async expandRecurringEvents(
    calendarId: ObjectId,
    gCalendarId: string,
    recurringEvents: gSchema$Event[],
    perPage = 1000,
  ): Promise<Array<Schema_Base_Event | Schema_Instance_Event>> {
    const baseAndInstances: Array<Schema_Base_Event | Schema_Instance_Event> =
      [];

    for (const event of recurringEvents) {
      const isBase = isBaseGCalEvent(event);
      const isInstance = isInstanceGCalEvent(event);
      const isCancelled = isCancelledGCalEvent(event);

      if (isCancelled) continue;

      if (isBase) {
        const dbBaseEvent = await mongoService.event.findOne(
          { "metadata.id": event.id, calendar: calendarId },
          { projection: { _id: 1 } },
        );

        const baseEvent = BaseEventSchema.parse(
          MapGCalEvent.toEvent(event, {
            origin: Origin.GOOGLE_IMPORT,
            calendar: calendarId,
            _id: dbBaseEvent?._id ?? new ObjectId(),
          }),
        );

        const instances = await this.getGCalRecurringEventInstances(
          gCalendarId,
          EventMetadataSchema.parse(baseEvent.metadata).id,
          perPage,
        );

        const compassInstances = instances
          .filter((i) => !isCancelledGCalEvent(i))
          .map((i) =>
            InstanceEventSchema.parse(
              MapGCalEvent.toEvent(i, {
                calendar: calendarId,
                origin: Origin.GOOGLE_IMPORT,
                recurrence: {
                  ...baseEvent.recurrence,
                  eventId: baseEvent._id,
                },
              }),
            ),
          );

        baseAndInstances.push(baseEvent, ...compassInstances);

        logger.debug(`Found base event during expansion ${event.id}`);

        continue;
      } else if (isInstance) {
        const singleInstance = InstanceEventSchema.parse(
          MapGCalEvent.toEvent(event, {
            origin: Origin.GOOGLE_IMPORT,
            calendar: calendarId,
          }),
        );

        baseAndInstances.push(singleInstance);

        logger.debug(
          `Mapped single instance ${event.id} (from base ${event.recurringEventId}) from incremental update.`,
        );

        continue;
      }
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
    calendar: Schema_Calendar,
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
          calendar,
          event as gSchema$EventBase,
          session,
          perPage,
        )
      : await this.syncEvent(calendar._id, event, session);

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
    calendar: Schema_Calendar,
    perPage = 1000,
    session?: ClientSession,
  ): Promise<{
    totalProcessed: number;
    totalBaseEventsChanged: number;
    totalChanged: number;
    nextSyncToken: string;
  }> {
    logger.info(`Starting importAllEvents for calendar ${calendar._id}.`);

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
      calendar.user.toString(),
      calendar.metadata.id,
      session,
    );

    const gCalResponse = gcalService.getAllEvents({
      gCal: this.gcal,
      calendarId: calendar.metadata.id,
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
            calendar,
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
        calendar.user.toString(),
        calendar.metadata.id,
        { nextPageToken: nextPageToken ?? undefined },
        session,
      );

      if (nextSyncToken) syncToken = nextSyncToken;
    }

    if (!syncToken) {
      // If no sync token (e.g., empty calendar or sync did not reach last page)
      throw error(
        GcalError.NoSyncToken,
        `Failed to finalize full import because nextSyncToken was not found for calendar ${calendar._id}. Incremental sync may not work correctly.`,
      );
    }

    const baseEventsSavedCount = stats.totalBaseEventsChanged;
    const instanceEventsSavedCount = stats.totalChanged - baseEventsSavedCount;
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    logger.info(
      `
  ImportAllEvents completed for calendar(${calendar._id.toString()}).
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
  public async importLatestEvents(user: ObjectId, perPage = 1000) {
    const eventSyncPayloads = await this.prepIncrementalImport(user);

    if (eventSyncPayloads === undefined || eventSyncPayloads.length === 0) {
      logger.info(
        `No calendars configured or ready for incremental event sync for user ${user}.`,
      );

      return []; // Return empty array if nothing to sync
    }

    const result = await this.assembleIncrementalEventImports(
      user,
      eventSyncPayloads,
      perPage,
    );

    return result;
  }

  public async syncEvent(
    calendar: ObjectId,
    gEvent: gSchema$Event,
    session?: ClientSession,
  ): Promise<{
    totalProcessed: number;
    totalSaved: number;
    totalInstancesSaved: number;
    upsertedId?: ObjectId;
    deletedId?: ObjectId;
  }> {
    const isCancelled = isCancelledGCalEvent(gEvent);

    if (isCancelled) {
      const cancelledEvent = await mongoService.event.findOneAndDelete(
        { "metadata.id": gEvent.id, calendar },
        { session },
      );

      return {
        totalProcessed: 1,
        totalInstancesSaved: 0,
        totalSaved: 0,
        deletedId: cancelledEvent?._id,
      };
    }

    // assemble event
    const event = MapGCalEvent.toEvent(gEvent, {
      origin: Origin.GOOGLE_IMPORT,
      calendar,
    });

    const cEvent = await mongoService.event.findOneAndUpdate(
      { "metadata.id": event.metadata?.id, calendar },
      {
        $set: EventSchema.omit({ _id: true }).parse(event),
        $setOnInsert: { _id: event._id },
      },
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
    calendar: Schema_Calendar,
    baseEvent: gSchema$EventBase,
    session?: ClientSession,
    perPage = 1000,
  ): Promise<{
    totalProcessed: number;
    totalSaved: number;
    totalInstancesSaved: number;
  }> {
    // assemble base event
    const baseImport = await this.syncEvent(calendar._id, baseEvent, session);
    const baseId = baseImport?.upsertedId;

    if (!baseId) return baseImport;

    // assemble instances
    const instances = await this.getGCalRecurringEventInstances(
      calendar.metadata.id,
      baseEvent.id,
      perPage,
    );

    if (instances.length === 0) return baseImport;

    const cInstances = instances.map((instance) =>
      MapGCalEvent.toEvent(instance, {
        origin: Origin.GOOGLE_IMPORT,
        calendar: calendar._id,
        recurrence: {
          rule: baseEvent.recurrence,
          eventId: baseId,
        },
      }),
    );

    const bulkUpsert = mongoService.event.initializeUnorderedBulkOp();

    cInstances.forEach((instance) => {
      bulkUpsert
        .find({
          "metadata.id": EventMetadataSchema.parse(instance.metadata).id,
          calendar,
        })
        .upsert()
        .update({
          $setOnInsert: { _id: instance._id },
          $set: {
            ...InstanceEventSchema.omit({ _id: true }).parse(instance),
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
  private async prepIncrementalImport(
    userId: ObjectId,
  ): Promise<SyncDetails[]> {
    const sync = await getSync({ user: userId.toString() });

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

      return sync.google?.events ?? [];
    }

    const { gCalendarIds, nextSyncToken } =
      await syncService.getCalendarsToSync(this.gcal);

    await updateSync(
      Resource_Sync.CALENDAR,
      userId.toString(),
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

    const updatedSync = await getSync({ user: userId.toString() });

    if (updatedSync?.google?.events?.length === 0) {
      throw error(
        SyncError.NoSyncRecordForUser,
        "Prepping for incremental import failed",
      );
    }

    return updatedSync?.google?.events ?? [];
  }

  /**
   * Process updates for a calendar, handling pagination and event processing
   */
  public async importEventsByCalendar(
    userId: ObjectId,
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

      const calendar = await calendarService
        .getByUserAndProvider(userId, gCalendarId, CalendarProvider.GOOGLE)
        .then((cal) =>
          CompassCalendarSchema.parse(cal, {
            error: () =>
              `Calendar ${gCalendarId} not found for user ${userId.toString()}`,
          }),
        );

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
        calendar._id,
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
      userId.toString(),
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
  private async updateDatabase(calendar: ObjectId, events: EventsToModify) {
    const { toDelete, toUpdate } = events;
    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Handle deletions
    if (toDelete.length > 0) {
      const deleteResult = await mongoService.event.deleteMany({
        calendar,
        "metadata.id": { $in: toDelete },
      });

      deleted = deleteResult.deletedCount || 0;
    }

    // Handle updates/creations (Upserts)
    if (toUpdate.length > 0) {
      const bulkOps = toUpdate.map((event) => ({
        updateOne: {
          filter: {
            calendar,
            "metadata.id": event.metadata?.id,
          },
          update: {
            $set: EventSchema.omit({ _id: true }).parse(event),
            $setOnInsert: { _id: event._id },
          },
          upsert: true,
        },
      }));

      const result = await mongoService.event.bulkWrite(bulkOps);

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
export const createSyncImport = async (user: ObjectId | gCalendar) => {
  const gcal = user instanceof ObjectId ? await getGcalClient(user) : user;

  return new SyncImport(gcal);
};
