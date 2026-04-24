import { Logger } from "@core/logger/winston.logger";
import { shouldImportGCal } from "@core/util/event/event.util";
import { getGoogleRepairErrorMessage } from "@backend/common/errors/integration/gcal/gcal.errors";
import { isInvalidGoogleToken } from "@backend/common/services/gcal/gcal.utils";
import { sseServer } from "@backend/servers/sse/sse.server";
import syncImportRunner from "@backend/sync/services/import/sync.import-runner";
import { syncCompassEventsToGoogle } from "@backend/sync/services/outbound/sync.compass-to-google";
import userMetadataService from "@backend/user/services/user-metadata.service";

const logger = Logger("app:sync.repair-runner");
const activeFullSyncRestarts = new Set<string>();

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

const syncRepairRunner = {
  restartGoogleCalendarSync,
};

export default syncRepairRunner;
