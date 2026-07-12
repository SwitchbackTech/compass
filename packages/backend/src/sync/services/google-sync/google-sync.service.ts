import { Logger } from "@core/logger/winston.logger";
import { type CalendarId } from "@core/types/domain-primitives";
import { Resource_Sync } from "@core/types/sync.types";
import {
  shouldDoIncrementalGCalSync,
  shouldImportGCal,
} from "@core/util/event/event.util";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import calendarService from "@backend/calendar/services/calendar.service";
import { getGoogleRepairErrorMessage } from "@backend/common/errors/integration/gcal/gcal.errors";
import {
  createGoogleRequestContext,
  type GoogleRequestContext,
} from "@backend/common/services/gcal/gcal.context";
import { isInvalidGoogleToken } from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import compassToGoogleBackfill from "@backend/sync/services/event-propagation/compass-to-google/compass-to-google-backfill";
import {
  createSyncImport,
  type SyncImport,
} from "@backend/sync/services/import/google-import.service";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";
import userMetadataService from "@backend/user/services/user-metadata.service";

const logger = Logger("app:google-sync.service");

const activeFullSyncRestarts = new Set<string>();

const notifyImportStart = (userId: string): void => {
  sseServer.publishSyncStatus(userId, { status: "syncing" });
};

const notifyImportEnd = (
  userId: string,
  payload: {
    operation: string;
    status: "COMPLETED" | "ERRORED" | "IGNORED";
    message?: string;
    eventsCount?: number;
    calendarsCount?: number;
  },
): void => {
  if (payload.status === "COMPLETED") {
    sseServer.publishImportCompleted(userId, {
      operation: payload.operation === "REPAIR" ? "repair" : "incremental",
      eventsCount: payload.eventsCount ?? 0,
      calendarsCount: payload.calendarsCount ?? 0,
    });
    sseServer.publishSyncStatus(userId, { status: "healthy" });
    return;
  }

  if (payload.status === "ERRORED") {
    sseServer.publishSyncStatus(userId, {
      status: "attention",
      code: "IMPORT_FAILED",
      retryable: true,
    });
  }
};

/**
 * Full import for the primary Google calendar (import stays
 * primary-calendar-only at this packet; multi-calendar discovery/import is
 * packet 04), inside a single transaction.
 */
async function importFull(
  syncImport: SyncImport,
  calendar: CalendarRecord,
  userId: string,
) {
  const session = await mongoService.startSession({
    causalConsistency: true,
  });

  session.startTransaction();

  try {
    const result = await syncImport.importAllEvents(
      userId,
      calendar,
      2500,
      session,
    );

    await session.commitTransaction();

    return result;
  } catch (err: unknown) {
    await session.abortTransaction();

    throw err;
  } finally {
    await session.endSession();
  }
}

async function importLatestGoogleCalendarChanges(
  userId: string,
  context?: GoogleRequestContext,
  perPage = 1000,
) {
  logger.info(`Starting incremental Google Calendar sync for user: ${userId}`);

  try {
    notifyImportStart(userId);

    const userMeta = await userMetadataService.fetchUserMetadata(
      userId,
      undefined,
      {
        skipAssessment: true,
      },
    );
    const proceed = shouldDoIncrementalGCalSync(userMeta);

    if (!proceed) {
      notifyImportEnd(userId, {
        operation: "INCREMENTAL",
        status: "IGNORED",
        message: `User ${userId} gcal incremental sync is in progress or completed, ignoring this request`,
      });

      return;
    }

    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { incrementalGCalSync: "IMPORTING" } },
    });

    const calendar = await calendarService.getPrimaryGoogleCalendar(userId);

    if (!calendar) {
      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "COMPLETED" } },
      });

      notifyImportEnd(userId, {
        operation: "INCREMENTAL",
        status: "COMPLETED",
        eventsCount: 0,
        calendarsCount: 0,
      });

      return;
    }

    const syncImport = context
      ? await createSyncImport(context)
      : await createSyncImport(userId);

    const result = await syncImport.importLatestEvents(
      userId,
      calendar,
      perPage,
    );

    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { incrementalGCalSync: "COMPLETED" } },
    });

    notifyImportEnd(userId, {
      operation: "INCREMENTAL",
      status: "COMPLETED",
      eventsCount: result.totalSaved + result.totalDeleted,
      calendarsCount: 1,
    });

    sseServer.publishEventsChanged(userId, {
      calendarId: calendar._id.toHexString() as CalendarId,
      eventIds: [],
      reason: "reconciled",
    });

    return result;
  } catch (error) {
    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { incrementalGCalSync: "ERRORED" } },
    });

    logger.error(
      `Incremental Google Calendar sync failed for user: ${userId}`,
      error,
    );

    notifyImportEnd(userId, {
      operation: "INCREMENTAL",
      status: "ERRORED",
      message: `Incremental Google Calendar sync failed for user: ${userId}`,
    });

    throw error;
  }
}

async function runGoogleCalendarSyncSetup(
  userId: string,
  options: { force?: boolean } = {},
) {
  const { default: userService } = await import(
    "@backend/user/services/user.service"
  );
  const isForce = options.force === true;
  const operation = isForce ? "REPAIR" : "INCREMENTAL";
  const ignoreMessage = `User ${userId} gcal import is in progress or completed, ignoring this request`;

  if (activeFullSyncRestarts.has(userId)) {
    notifyImportEnd(userId, {
      operation,
      status: "IGNORED",
      message: ignoreMessage,
    });
    return;
  }

  activeFullSyncRestarts.add(userId);

  try {
    const userMeta = await userService.fetchUserMetadata(userId);
    const importStatus = userMeta.sync?.importGCal;
    const isImporting = importStatus === "IMPORTING";
    const proceed = isForce ? !isImporting : shouldImportGCal(userMeta);

    if (!proceed) {
      notifyImportEnd(userId, {
        operation,
        status: "IGNORED",
        message: ignoreMessage,
      });

      return;
    }

    logger.warn(
      `Restarting Google Calendar sync for user: ${userId}${isForce ? " (forced)" : ""}`,
    );
    notifyImportStart(userId);
    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { importGCal: "IMPORTING" } },
    });

    await userService.stopGoogleCalendarSync(userId);
    const importResults =
      await googleCalendarSyncService.initializeGoogleCalendarSync(userId);

    await compassToGoogleBackfill
      .syncCompassEventsToGoogle(userId)
      .catch((err) => {
        logger.error(
          `Failed to sync Compass events to Google Calendar for user: ${userId}`,
          err,
        );
      });

    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { importGCal: "COMPLETED" } },
    });

    notifyImportEnd(userId, {
      operation,
      status: "COMPLETED",
      ...importResults,
    });

    const calendar = await calendarService.getPrimaryGoogleCalendar(userId);
    if (calendar) {
      sseServer.publishEventsChanged(userId, {
        calendarId: calendar._id.toHexString() as CalendarId,
        eventIds: [],
        reason: "reconciled",
      });
    }
  } catch (err) {
    try {
      await userService.stopGoogleCalendarSync(userId);
    } catch (cleanupError) {
      logger.error(
        `Failed to clean up partial Google Calendar sync state for user: ${userId}`,
        cleanupError,
      );
    }

    if (isInvalidGoogleToken(err)) {
      logger.warn(
        `Google Calendar repair failed because access was revoked for user: ${userId}`,
      );

      await userService.pruneGoogleData(userId);
      sseServer.publishSyncStatus(userId, {
        status: "attention",
        code: "GOOGLE_REVOKED",
        retryable: false,
      });
      return;
    }

    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { importGCal: "ERRORED" } },
    });

    logger.error(`Re-sync failed for user: ${userId}`, err);

    notifyImportEnd(userId, {
      operation,
      status: "ERRORED",
      message: getGoogleRepairErrorMessage(err),
    });
  } finally {
    activeFullSyncRestarts.delete(userId);
  }
}

/**
 * Discovers the user's Google calendars, then imports events for the
 * primary calendar only (A per the packet-03-phase-2 scope: multi-calendar
 * import/discovery is packet 04) and starts webhook watches for it.
 */
async function initializeGoogleCalendarSync(
  user: string,
): Promise<{ eventsCount: number; calendarsCount: number }> {
  const context = await createGoogleRequestContext(user);

  await calendarService.initializeGoogleCalendars(user, context);

  const calendar = await calendarService.getPrimaryGoogleCalendar(user);

  if (!calendar || calendar.source.provider !== "google") {
    logger.warn(`No primary Google calendar found for user: ${user}`);
    return { eventsCount: 0, calendarsCount: 0 };
  }

  const syncImport = await createSyncImport(context);
  const importResult = await importFull(syncImport, calendar, user);

  if (isUsingGcalWebhookHttps()) {
    await googleWatchService.startGoogleWatches(
      user,
      [
        { gCalendarId: Resource_Sync.CALENDAR },
        { gCalendarId: calendar.source.calendarId },
      ],
      context,
    );
  }

  return {
    eventsCount: importResult.totalSaved,
    calendarsCount: 1,
  };
}

async function repairGoogleCalendarSync(userId: string) {
  return runGoogleCalendarSyncSetup(userId, { force: true });
}

async function startGoogleCalendarSyncIfNeeded(userId: string) {
  return runGoogleCalendarSyncSetup(userId);
}

export const googleCalendarSyncService = {
  importLatestGoogleCalendarChanges,
  initializeGoogleCalendarSync,
  repairGoogleCalendarSync,
  startGoogleCalendarSyncIfNeeded,
};
