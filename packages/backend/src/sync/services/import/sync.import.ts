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
import { logSyncOperation } from "../log/sync.logger";
import syncService from "../sync.service";
import { assembleEventWatchPayloads } from "../watch/sync.watch";
import {
  assembleEventOperations,
  categorizeGcalEvents,
} from "./sync.import.util";

const logger = Logger("app:sync.import");

export interface ProcessedEvents {
  regularEvents: Schema_Event_Core[];
  expandedEvents: Schema_Event_Core[];
  toDelete: string[];
}

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

  /**
   * Fetches all instances of a recurring event series and returns them as Compass events
   */
  private async getRecurringEventInstances(
    userId: string,
    calendarId: string,
    recurringEventId: string,
  ): Promise<Schema_Event_Core[]> {
    const timeMin = new Date().toISOString();
    const timeMax = dayjs().add(6, "months").toISOString();

    const { data } = await gcalService.getEventInstances(
      this.gcal,
      calendarId,
      recurringEventId,
      timeMin,
      timeMax,
    );
    const instances = data?.items;

    if (!instances) {
      return [];
    }

    return MapEvent.toCompass(userId, instances, Origin.GOOGLE_IMPORT);
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

    do {
      const syncToken = this.getSyncToken(nextPageToken, nextSyncToken);
      const response = await this.getUpdatedEvents(gCalendarId, syncToken);
      const updatedEvents = response.items || [];

      if (updatedEvents.length === 0) {
        return { updated: 0, deleted: 0, nextSyncToken };
      }

      const processedEvents = await this.processGoogleEvents(
        userId,
        gCalendarId,
        updatedEvents,
      );

      await logSyncOperation(userId, gCalendarId, {
        updatedEvents,
        summary: {
          toUpdate: updatedEvents,
          toDelete: processedEvents.toDelete,
        },
        nextSyncToken: response.nextSyncToken ?? undefined,
      });

      const { updated, deleted } = await this.updateDatabase(
        userId,
        processedEvents,
      );

      totalUpdated += updated;
      totalDeleted += deleted;

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
      nextSyncToken,
    };
  }

  /**
   * Process events from Google Calendar, handling both regular and recurring events
   */
  private async processGoogleEvents(
    userId: string,
    gCalendarId: string,
    updatedEvents: gSchema$Event[],
  ): Promise<ProcessedEvents> {
    const { toDelete, toUpdate } = categorizeGcalEvents(updatedEvents);

    // Handle recurring events
    const expandedEvents: Schema_Event_Core[] = [];
    for (const event of toUpdate) {
      if (
        event.recurringEventId ||
        (event.recurrence && event.recurrence.length > 0)
      ) {
        const recurringId = event.recurringEventId || event.id;
        if (!recurringId) continue;

        const instances = await this.getRecurringEventInstances(
          userId,
          gCalendarId,
          recurringId,
        );
        expandedEvents.push(...instances);
      }
    }

    // Process regular events
    const regularEvents = MapEvent.toCompass(
      userId,
      toUpdate.filter((e) => !e.recurringEventId && !e.recurrence),
      Origin.GOOGLE_IMPORT,
    );

    return { regularEvents, expandedEvents, toDelete };
  }

  /**
   * Update database with processed events
   */
  private async updateDatabase(
    userId: string,
    events: ProcessedEvents,
  ): Promise<{ updated: number; deleted: number }> {
    const ops = assembleEventOperations(userId, events.toDelete, []);
    let updated = 0;
    let deleted = 0;

    // First handle deletions
    if (ops.length > 0) {
      const result = await mongoService.db
        .collection(Collections.EVENT)
        .bulkWrite(ops);

      if (!result.ok) {
        throw error(
          GenericError.NotSure,
          "Events not updated after notification",
        );
      }

      updated +=
        result.insertedCount + result.upsertedCount + result.modifiedCount;
      deleted += result.deletedCount;
    }

    // Then create/update all events including recurring instances
    const allEvents = [...events.regularEvents, ...events.expandedEvents];
    if (allEvents.length > 0) {
      console.log("! creating ", allEvents.length, " events");
      await eventService.createMany(allEvents);
      updated += allEvents.length;
    }

    return { updated, deleted };
  }
}

// Factory function to create instances
export const createSyncImport = async (id: string | gCalendar) => {
  const gcal = typeof id === "string" ? await getGcalClient(id) : id;
  return new SyncImport(gcal);
};
