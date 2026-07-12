import { Logger } from "@core/logger/winston.logger";
import { sseServer } from "@backend/servers/sse/sse.server";
import userService from "@backend/user/services/user.service";

const logger = Logger("app:google-sync.revoked");

/**
 * Shared revoked/missing-Google-access handling (A29): prunes Google-owned
 * data while preserving everything Compass-local, then notifies connected
 * clients. Every entry point that detects this (webhook notifications,
 * google-sync setup, express error handling, watch maintenance, watch
 * repair) funnels through here instead of each calling
 * `deleteCompassDataForUser` (a full account wipe) or reimplementing the
 * prune-and-notify pair.
 */
export const pruneGoogleDataAndNotifyRevoked = async (
  userId: string,
  reason: string,
): Promise<void> => {
  logger.warn(`Cleaning data after ${reason} for user: ${userId}`);
  await userService.pruneGoogleData(userId);
  sseServer.publishSyncStatus(userId, {
    status: "attention",
    code: "GOOGLE_REVOKED",
    retryable: false,
  });
};
