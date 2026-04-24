import { Logger } from "@core/logger/winston.logger";
import { type gCalendar } from "@core/types/gcal";
import { Resource_Sync } from "@core/types/sync.types";
import { shouldDoIncrementalGCalSync } from "@core/util/event/event.util";
import { getGcalClient } from "@backend/auth/services/google/clients/google.calendar.client";
import calendarService from "@backend/calendar/services/calendar.service";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { createSyncImport } from "@backend/sync/services/import/sync.import";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";
import { updateSync } from "@backend/sync/util/sync.queries";
import { isUsingGcalWebhookHttps } from "@backend/sync/util/sync.util";
import userMetadataService from "@backend/user/services/user-metadata.service";

const logger = Logger("app:sync.import-runner");

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
  startGoogleCalendarSync,
};

export default syncImportRunner;
