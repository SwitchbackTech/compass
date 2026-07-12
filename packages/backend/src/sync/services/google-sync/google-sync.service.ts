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
import { createConcurrencyLimiter } from "@backend/common/util/concurrency-limiter.util";
import { sseServer } from "@backend/servers/sse/sse.server";
import compassToGoogleBackfill from "@backend/sync/services/event-propagation/compass-to-google/compass-to-google-backfill";
import { pruneGoogleDataAndNotifyRevoked } from "@backend/sync/services/google-sync/google-sync.revoked";
import {
  createSyncImport,
  type SyncImport,
} from "@backend/sync/services/import/google-import.service";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";
import { googleWatchRepairService } from "@backend/sync/services/watch/google-watch-repair.service";
import userMetadataService from "@backend/user/services/user-metadata.service";

const logger = Logger("app:google-sync.service");

const activeFullSyncRestarts = new Set<string>();

/**
 * Defensive, fire-and-forget nudge for the watch repair coordinator from
 * the sync-start "ignored" paths below (an already-in-progress or
 * already-completed sync still leaves stale/missing watches un-repaired).
 * Cooldown+lease inside the coordinator keep this cheap on what is a hot
 * path. Static import above (not the dynamic pattern used for
 * user.service in runGoogleCalendarSyncSetup) because this call site runs
 * on every ignored request; google-watch-repair.service.ts reaches back to
 * this module dynamically instead, which breaks the cycle without paying
 * dynamic-import cost here - same trade-off as google-watch.service.ts:192-193.
 */
const triggerWatchRepairInBackground = (userId: string): void => {
  googleWatchRepairService.repairGoogleWatchesForUser(userId).catch((err) => {
    logger.error(`Google watch repair failed for user: ${userId}`, err);
  });
};

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
 * Bounds how many calendars import events concurrently (B5). Kept low
 * relative to Google's per-user quota; each calendar's own paging already
 * bounds how much work is in flight for that calendar.
 */
const CALENDAR_IMPORT_CONCURRENCY = 4;

/**
 * Full import for a single Google calendar. Deliberately runs with no
 * Mongo transaction wrapper - see the comment on
 * `SyncImport.importAllEvents` for why per-page durability (rather than
 * one big rollback-or-commit) is what makes a failed calendar resumable.
 */
async function importFull(
  syncImport: SyncImport,
  calendar: CalendarRecord,
  userId: string,
) {
  return syncImport.importAllEvents(userId, calendar, 2500);
}

type CalendarImportFailure = { calendarId: string; error: string };

const toErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "Unknown error";

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
    triggerWatchRepairInBackground(userId);
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
      triggerWatchRepairInBackground(userId);

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
    const { failedCalendars, ...importResults } =
      await googleCalendarSyncService.initializeGoogleCalendarSync(userId);

    if (failedCalendars.length > 0) {
      logger.error(
        `Google Calendar import completed for user: ${userId} with ${failedCalendars.length} calendar(s) that failed to import; each retains any progress made before failing and can be retried in isolation.`,
      );
    }

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
      await pruneGoogleDataAndNotifyRevoked(
        userId,
        "google calendar sync setup",
      );
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
 * Discovers the user's Google calendars, then imports events for every
 * owner/writer/reader calendar (bounded concurrency, B5) - freeBusyReader
 * calendars get a CalendarRecord from reconciliation above but no event
 * import, since their availability comes from a separate freeBusy.query
 * contract (packet 01, out of scope here). One calendar's import failure
 * doesn't abort the others (B8): each is isolated via Promise.allSettled,
 * and because `SyncImport.importAllEvents` persists per-page progress with
 * no surrounding transaction, a failed calendar retains whatever pages it
 * already completed and can be retried in isolation. A primary-calendar
 * failure is still treated as fatal for this call (watches only start for
 * primary + CalendarList, same as before this packet).
 */
async function initializeGoogleCalendarSync(user: string): Promise<{
  eventsCount: number;
  calendarsCount: number;
  failedCalendars: CalendarImportFailure[];
}> {
  const context = await createGoogleRequestContext(user);

  await calendarService.initializeGoogleCalendars(user, context);

  const calendars = await calendarService.getActiveGoogleCalendars(user);
  const primaryCalendar = calendars.find(
    (c) => c.source.provider === "google" && c.isPrimary,
  );

  if (!primaryCalendar || primaryCalendar.source.provider !== "google") {
    logger.warn(`No primary Google calendar found for user: ${user}`);
    return { eventsCount: 0, calendarsCount: 0, failedCalendars: [] };
  }

  // freeBusyReader calendars get no event import - their CalendarRecord
  // already exists from initializeGoogleCalendars above.
  const importableCalendars = calendars.filter(
    (c) => c.source.provider === "google" && c.access !== "freeBusyReader",
  );

  const syncImport = await createSyncImport(context);
  const limit = createConcurrencyLimiter(CALENDAR_IMPORT_CONCURRENCY);

  const outcomes = await Promise.allSettled(
    importableCalendars.map((calendar) =>
      limit(async () => ({
        calendar,
        result: await importFull(syncImport, calendar, user),
      })),
    ),
  );

  let eventsCount = 0;
  let calendarsCount = 0;
  const failedCalendars: CalendarImportFailure[] = [];
  let primaryFailure: unknown;

  outcomes.forEach((outcome, index) => {
    const calendar = importableCalendars[index]!;
    const calendarId = calendar._id.toHexString();

    if (outcome.status === "fulfilled") {
      eventsCount += outcome.value.result.totalSaved;
      calendarsCount += 1;
      return;
    }

    failedCalendars.push({ calendarId, error: toErrorMessage(outcome.reason) });

    // No calendar names/Google ids/tokens in logs (B10 head start) - a
    // Compass calendar _id is an internal identifier, not user data.
    logger.warn(
      `Google Calendar event import failed for calendar ${calendarId} (user: ${user}); already-imported pages remain durable and this calendar can be retried in isolation.`,
      outcome.reason,
    );

    if (calendar._id.equals(primaryCalendar._id)) {
      primaryFailure = outcome.reason;
    }
  });

  if (primaryFailure !== undefined) {
    throw primaryFailure;
  }

  if (isUsingGcalWebhookHttps()) {
    // Events watches only make sense for calendars whose import actually
    // succeeded this run - a failed calendar's sync token isn't durable
    // (see the comment above outcomes.forEach), so watching it would just
    // produce notifications with nothing valid to reconcile against.
    // freeBusyReader calendars fall out naturally since they were already
    // excluded from importableCalendars/outcomes above.
    const successfulCalendarIds = outcomes
      .filter((outcome) => outcome.status === "fulfilled")
      .map((outcome) => outcome.value.calendar.source)
      .filter(
        (source): source is Extract<typeof source, { provider: "google" }> =>
          source.provider === "google",
      )
      .map((source) => source.calendarId);

    await googleWatchService.startGoogleWatches(
      user,
      [
        { gCalendarId: Resource_Sync.CALENDAR },
        ...successfulCalendarIds.map((gCalendarId) => ({ gCalendarId })),
      ],
      context,
    );
  }

  return { eventsCount, calendarsCount, failedCalendars };
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
