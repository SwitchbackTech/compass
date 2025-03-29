import { Origin } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
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
import { GCalRecurringEventProvider } from "@backend/event/services/recur/providers/gcal/gcal.recur.provider";
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
import { logSyncOperation } from "../log/sync.logger";
import syncService from "../sync.service";
import { assembleEventWatchPayloads } from "../watch/sync.watch";
import { EventsToModify } from "./sync.import.types";
import { organizeGcalEventsByType } from "./sync.import.util";

const logger = Logger("app:sync.import");

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

  private async categorizeGcalEvents(
    userId: string,
    gCalendarId: string,
    updatedEvents: gSchema$Event[],
  ): Promise<EventsToModify> {
    const { toUpdate, toDelete } = organizeGcalEventsByType(updatedEvents);

    // Create GCal provider for handling recurring events
    const gcalProvider = new GCalRecurringEventProvider(this.gcal);
    const expandedEvents = await gcalProvider.expandRecurringEvents(
      userId,
      gCalendarId,
      toUpdate.recurring,
    );

    const regularEvents = MapEvent.toCompass(
      userId,
      toUpdate.nonRecurring,
      Origin.GOOGLE_IMPORT,
    );

    const toUpdateCombined = [...regularEvents, ...expandedEvents];
    await logSyncOperation(userId, gCalendarId, {
      updatedEvents,
      summary: {
        toUpdate: toUpdateCombined,
        toDelete: toDelete,
      },
      nextSyncToken: "idk",
    });

    return {
      toUpdate: toUpdateCombined,
      toDelete,
    };
  }

  /**
   * Gets the appropriate sync token for the current operation
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
        "Failed to get correct sync token",
      );
    }

    return syncToken;
  }

  /**
   * Fetches updated events from Google Calendar
   */
  private async getUpdatedEvents(gCalendarId: string, syncToken: string) {
    const response = await gcalService.getEvents(this.gcal, {
      calendarId: gCalendarId,
      syncToken,
    });

    if (!response) {
      throw error(SyncError.NoEventChanges, "Import Ignored");
    }

    console.log(
      `++ Updated events (using syncToken: ${syncToken})`,
      JSON.stringify(response.data, null, 2),
    );
    return response.data;
  }

  /**
   * Imports all events for a calendar
   */
  public async importAllEvents(userId: string, calendarId: string) {
    let nextPageToken: string | undefined = undefined;
    let nextSyncToken: string | undefined = undefined;
    let total = 0;

    do {
      const params: gParamsImportAllEvents = {
        calendarId,
        singleEvents: true,
        pageToken: nextPageToken,
      };

      const gEvents = await gcalService.getEvents(this.gcal, params);

      if (!gEvents || !gEvents.data.items) {
        throw error(EventError.NoGevents, "Potentially missing events");
      }

      if (gEvents.data.items.length > 0) {
        total += gEvents.data.items.length;

        const cEvents = MapEvent.toCompass(
          userId,
          gEvents.data.items,
          Origin.GOOGLE_IMPORT,
        );
        if (cEvents.length > 0) {
          await eventService.createMany(cEvents);
        }
      }

      nextPageToken = gEvents.data.nextPageToken ?? undefined;
      nextSyncToken = gEvents.data.nextSyncToken ?? undefined;
    } while (nextPageToken !== undefined);

    // nextSyncToken is defined when there are no more events
    if (!nextSyncToken) {
      throw error(GcalError.NoSyncToken, "Failed to get sync token");
    }

    return {
      total,
      nextSyncToken,
    };
  }

  /**
   * Imports the latest events for a user
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
   * Prepares for incremental import of events
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
      eventWatchPayloads,
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

      const eventsToModify = await this.categorizeGcalEvents(
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
        `Import failed for calendar: ${gCalendarId}`,
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
   * Update database with processed events
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

    // Handle updates/creations in a single bulk operation
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
