import { Logger } from "@core/logger/winston.logger";
import { type gCalendar } from "@core/types/gcal";
import { Resource_Sync } from "@core/types/sync.types";
import {
  shouldDoIncrementalGCalSync,
  shouldImportGCal,
} from "@core/util/event/event.util";
import { getGcalClient } from "@backend/auth/services/google/clients/google.calendar.client";
import calendarService from "@backend/calendar/services/calendar.service";
import { getGoogleRepairErrorMessage } from "@backend/common/errors/integration/gcal/gcal.errors";
import { isInvalidGoogleToken } from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { createSyncImport } from "@backend/sync/services/import/sync.import";
import { syncCompassEventsToGoogle } from "@backend/sync/services/outbound/sync.compass-to-google";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";
import { updateSync } from "@backend/sync/util/sync.queries";
import { isUsingGcalWebhookHttps } from "@backend/sync/util/sync.util";
import userMetadataService from "@backend/user/services/user-metadata.service";

const logger = Logger("app:sync.import-runner");
const activeFullSyncRestarts = new Set<string>();

export const importFull = async (
  gcal: gCalendar,
  gCalendarIds: string[],
  userId: string,
) => {
  const session = await mongoService.startSession({
    causalConsistency: true,
  });

  session.startTransaction();

  try {
    const syncImport = await createSyncImport(gcal);

    const eventImports = await Promise.all(
      gCalendarIds.map(async (gCalId) => {
        const { nextSyncToken, ...result } = await syncImport.importAllEvents(
          userId,
          gCalId,
          2500,
        );

        await updateSync(
          Resource_Sync.EVENTS,
          userId,
          gCalId,
          { nextSyncToken },
          session,
        );

        return { gCalId, ...result };
      }),
    );

    await session.commitTransaction();

    return eventImports;
  } catch (error: unknown) {
    await session.abortTransaction();

    throw error;
  }
};

export const importIncremental = async (
  userId: string,
  gcal?: gCalendar,
  perPage = 1000,
) => {
  logger.info(`Starting incremental Google Calendar sync for user: ${userId}`);

  try {
    sseServer.handleImportGCalStart(userId);

    const userMeta = await userMetadataService.fetchUserMetadata(
      userId,
      undefined,
      {
        skipAssessment: true,
      },
    );
    const proceed = shouldDoIncrementalGCalSync(userMeta);

    if (!proceed) {
      sseServer.handleImportGCalEnd(userId, {
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

    const syncImport = gcal
      ? await createSyncImport(gcal)
      : await createSyncImport(userId);

    const result = await syncImport.importLatestEvents(userId, perPage);

    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { incrementalGCalSync: "COMPLETED" } },
    });

    sseServer.handleImportGCalEnd(userId, {
      operation: "INCREMENTAL",
      status: "COMPLETED",
    });
    sseServer.handleBackgroundCalendarChange(userId);

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

    sseServer.handleImportGCalEnd(userId, {
      operation: "INCREMENTAL",
      status: "ERRORED",
      message: `Incremental Google Calendar sync failed for user: ${userId}`,
    });

    throw error;
  }
};

export const restartGoogleCalendarSync = async (
  userId: string,
  options: { force?: boolean } = {},
) => {
  const { default: userService } = await import(
    "@backend/user/services/user.service"
  );
  const isForce = options.force === true;
  const operation = isForce ? "REPAIR" : "INCREMENTAL";
  const ignoreMessage = `User ${userId} gcal import is in progress or completed, ignoring this request`;

  if (activeFullSyncRestarts.has(userId)) {
    sseServer.handleImportGCalEnd(userId, {
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
      sseServer.handleImportGCalEnd(userId, {
        operation,
        status: "IGNORED",
        message: ignoreMessage,
      });
      return;
    }

    logger.warn(
      `Restarting Google Calendar sync for user: ${userId}${isForce ? " (forced)" : ""}`,
    );
    sseServer.handleImportGCalStart(userId);
    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { importGCal: "IMPORTING" } },
    });

    await userService.stopGoogleCalendarSync(userId);
    const importResults =
      await syncImportRunner.startGoogleCalendarSync(userId);

    await syncCompassEventsToGoogle(userId).catch((err) => {
      logger.error(
        `Failed to sync Compass events to Google Calendar for user: ${userId}`,
        err,
      );
    });

    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { importGCal: "COMPLETED" } },
    });

    sseServer.handleImportGCalEnd(userId, {
      operation,
      status: "COMPLETED",
      ...importResults,
    });
    sseServer.handleBackgroundCalendarChange(userId);
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
      sseServer.handleGoogleRevoked(userId);
      return;
    }

    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { importGCal: "ERRORED" } },
    });

    logger.error(`Re-sync failed for user: ${userId}`, err);

    sseServer.handleImportGCalEnd(userId, {
      operation,
      status: "ERRORED",
      message: getGoogleRepairErrorMessage(err),
    });
  } finally {
    activeFullSyncRestarts.delete(userId);
  }
};

export const startGoogleCalendarSync = async (
  user: string,
): Promise<{ eventsCount: number; calendarsCount: number }> => {
  const gcal = await getGcalClient(user);

  const calendarInit = await calendarService.initializeGoogleCalendars(
    user,
    gcal,
  );

  const gCalendarIds = calendarInit.googleCalendars
    .map(({ id }) => id)
    .filter((id): id is string => id !== undefined && id !== null);

  const importResults = await syncImportRunner.importFull(
    gcal,
    gCalendarIds,
    user,
  );

  if (isUsingGcalWebhookHttps()) {
    await syncWatchService.startWatchingGcalResources(
      user,
      [
        { gCalendarId: Resource_Sync.CALENDAR },
        ...gCalendarIds.map((gCalendarId) => ({ gCalendarId })),
      ],
      gcal,
    );
  }

  const eventsCount = importResults.reduce(
    (sum, result) => sum + result.totalChanged,
    0,
  );

  return {
    eventsCount,
    calendarsCount: gCalendarIds.length,
  };
};

export const syncImportRunner = {
  importFull,
  importIncremental,
  restartGoogleCalendarSync,
  startGoogleCalendarSync,
};

export default syncImportRunner;
