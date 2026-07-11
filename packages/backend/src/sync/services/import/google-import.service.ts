import { type ClientSession } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type gCalendar } from "@core/types/gcal";
import { Resource_Sync } from "@core/types/sync.types";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { GoogleEventSync } from "@backend/event/google-event-sync.service";
import { getGcalClient } from "@backend/sync/services/google-sync/gcal.client";
import {
  getGCalEventsSyncPageToken,
  getSync,
  updateSync,
} from "@backend/sync/services/records/sync-records.repository";

const logger = Logger("app:google-import");

export type ImportStats = {
  totalProcessed: number;
  totalSaved: number;
  totalDeleted: number;
  totalIgnored: number;
  totalInvalid: number;
};

const emptyStats = (): ImportStats => ({
  totalProcessed: 0,
  totalSaved: 0,
  totalDeleted: 0,
  totalIgnored: 0,
  totalInvalid: 0,
});

const addStats = (
  stats: ImportStats,
  delta: {
    processed: number;
    saved: number;
    deleted: number;
    ignored: number;
    invalid: number;
  },
): ImportStats => ({
  totalProcessed: stats.totalProcessed + delta.processed,
  totalSaved: stats.totalSaved + delta.saved,
  totalDeleted: stats.totalDeleted + delta.deleted,
  totalIgnored: stats.totalIgnored + delta.ignored,
  totalInvalid: stats.totalInvalid + delta.invalid,
});

/**
 * Imports Google Calendar events onto their owning CalendarRecord (B8). At
 * this packet, import is primary-calendar-only (multi-calendar discovery is
 * packet 04): callers resolve the primary Google CalendarRecord once and
 * pass it in.
 */
export class SyncImport {
  private gcal: gCalendar;

  constructor(gcal: gCalendar) {
    this.gcal = gcal;
  }

  /**
   * Full sync: imports every event on the calendar (Compass never saw it
   * before, or is reconciling from scratch).
   */
  async importAllEvents(
    userId: string,
    calendar: CalendarRecord,
    perPage = 1000,
    session?: ClientSession,
  ): Promise<ImportStats & { nextSyncToken: string }> {
    if (calendar.source.provider !== "google") {
      throw error(
        GcalError.Unsure,
        "importAllEvents requires a Google-sourced calendar",
      );
    }

    logger.info(
      `Starting importAllEvents for user ${userId}, calendar ${calendar.source.calendarId}.`,
    );

    const startTime = performance.now();
    const sync = new GoogleEventSync(this.gcal, calendar);

    let stats = emptyStats();
    let syncToken: string | undefined;

    const pageToken = await getGCalEventsSyncPageToken(
      userId,
      calendar.source.calendarId,
      session,
    );

    const gCalResponse = gcalService.getAllEvents({
      gCal: this.gcal,
      calendarId: calendar.source.calendarId,
      maxResults: perPage,
      pageToken: pageToken ?? undefined,
    });

    for await (const {
      items = [],
      nextSyncToken,
      nextPageToken,
    } of gCalResponse) {
      if (items.length > 0) {
        const delta = await sync.apply(items, perPage, session);
        stats = addStats(stats, delta);
      }

      await updateSync(
        Resource_Sync.EVENTS,
        userId,
        calendar.source.calendarId,
        { nextPageToken: nextPageToken ?? undefined },
        session,
      );

      if (nextSyncToken) syncToken = nextSyncToken;
    }

    if (!syncToken) {
      throw error(
        GcalError.NoSyncToken,
        `Failed to finalize full import because nextSyncToken was not found for ${calendar.source.calendarId}. Incremental sync may not work correctly.`,
      );
    }

    const duration = (performance.now() - startTime) / 1000;
    logger.info(
      `importAllEvents completed for ${calendar.source.calendarId}.
    Max results / page: ${perPage}
    Total GCal events processed: ${stats.totalProcessed}.
    Total saved: ${stats.totalSaved}. Deleted: ${stats.totalDeleted}. Ignored: ${stats.totalIgnored}. Invalid: ${stats.totalInvalid}.
    Duration: ${duration.toFixed(2)}s`,
    );

    return { ...stats, nextSyncToken: syncToken };
  }

  /**
   * Incremental sync: imports only what changed since the calendar's last
   * known sync token.
   */
  async importLatestEvents(
    userId: string,
    calendar: CalendarRecord,
    perPage = 1000,
  ): Promise<ImportStats> {
    if (calendar.source.provider !== "google") {
      throw error(
        GcalError.Unsure,
        "importLatestEvents requires a Google-sourced calendar",
      );
    }

    const gCalendarId = calendar.source.calendarId;
    const sync = await getSync({ userId });
    const eventSync = sync?.google?.events?.find(
      (e) => e.gCalendarId === gCalendarId,
    );

    if (!eventSync?.nextSyncToken) {
      logger.info(
        `No sync token found for calendar ${gCalendarId}; skipping incremental import for user ${userId}.`,
      );
      return emptyStats();
    }

    return this.importEventsByCalendar(
      userId,
      calendar,
      eventSync.nextSyncToken,
      perPage,
    );
  }

  /**
   * Processes updates for a calendar, handling pagination.
   */
  async importEventsByCalendar(
    userId: string,
    calendar: CalendarRecord,
    initialSyncToken: string,
    perPage = 1000,
  ): Promise<ImportStats> {
    if (calendar.source.provider !== "google") {
      throw error(
        GcalError.Unsure,
        "importEventsByCalendar requires a Google-sourced calendar",
      );
    }

    const sync = new GoogleEventSync(this.gcal, calendar);

    let stats = emptyStats();
    let syncToken: string | undefined = initialSyncToken;
    let pageToken: string | undefined;

    do {
      const token = pageToken ?? syncToken;
      if (!token) {
        throw error(
          SyncError.NoSyncToken,
          "Incremental sync failed because no sync token was found",
        );
      }

      const response = await gcalService.getEvents(this.gcal, {
        calendarId: calendar.source.calendarId,
        ...(pageToken ? { pageToken } : { syncToken: token }),
        maxResults: perPage,
      });

      const items = response.data.items ?? [];

      if (items.length > 0) {
        const delta = await sync.apply(items, perPage);
        stats = addStats(stats, delta);
      }

      pageToken = response.data.nextPageToken ?? undefined;
      if (response.data.nextSyncToken) syncToken = response.data.nextSyncToken;
    } while (pageToken);

    if (!syncToken) {
      throw error(
        GcalError.NoSyncToken,
        `Import finished for calendar: ${calendar.source.calendarId}, but failed to get final sync token.`,
      );
    }

    await updateSync(Resource_Sync.EVENTS, userId, calendar.source.calendarId, {
      nextSyncToken: syncToken,
    });

    return stats;
  }
}

export const createSyncImport = async (id: string | gCalendar) => {
  const gcal = typeof id === "string" ? await getGcalClient(id) : id;
  return new SyncImport(gcal);
};
