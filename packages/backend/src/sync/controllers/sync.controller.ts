import { type NextFunction, type Request, type Response } from "express";
import { ObjectId } from "mongodb";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import {
  isFullSyncRequired,
  isGoogleError,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { isMissingGoogleRefreshToken } from "@backend/sync/services/google-sync/google-sync.errors";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import { publicWatchNotificationIngress } from "@backend/sync/services/public-watch-notifications/public-watch-notification.ingress";
import { getSync } from "@backend/sync/services/records/sync-records.repository";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import { googleWatchMaintenanceService } from "@backend/sync/services/watch/google-watch-maintenance.service";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import { ImportGCalRequestSchema } from "../sync.types";

const logger = Logger("app:sync.controller");

export class SyncController {
  private static handleMissingRefreshToken = async (
    res: Response,
    channelId: string,
    resourceId: string,
  ): Promise<void> => {
    const _id = new ObjectId(channelId);
    const watch = await mongoService.watch.findOne({ _id, resourceId });

    if (watch) {
      await pruneAndNotifyGoogleRevoked(watch.user, "missing refresh token");
      res.status(Status.GONE).send({
        // This ack body goes back to Google's webhook infra, not to our
        // frontend; the client-facing signal is the syncStatusChanged/
        // GOOGLE_REVOKED message published by pruneAndNotifyGoogleRevoked
        // below.
        code: "GOOGLE_REVOKED",
        message: "Missing refresh token, pruned Google data",
      });
      return;
    }

    logger.warn(
      `Ignored notification - missing refresh token for channel: ${channelId}`,
    );
    res.status(Status.GONE).send("Missing refresh token");
  };

  private static handleInvalidGoogleToken = async (
    res: Response,
    channelId: string,
    userId: string | undefined,
  ): Promise<void> => {
    if (userId) {
      await pruneAndNotifyGoogleRevoked(userId, "revoked access");
      res.status(Status.GONE).send({
        // This ack body goes back to Google's webhook infra, not to our
        // frontend; the client-facing signal is the syncStatusChanged/
        // GOOGLE_REVOKED message published by pruneAndNotifyGoogleRevoked
        // below.
        code: "GOOGLE_REVOKED",
        message: "User revoked access, pruned Google data",
      });
      return;
    }

    const msg = `Ignored update due to revoked access for channelId: ${channelId}`;
    logger.warn(msg);
    res.status(Status.GONE).send(msg);
  };

  private static handleFullSyncRequired = (
    res: Response,
    userId: string,
  ): void => {
    // do not await this call
    googleCalendarSyncService.repairGoogleCalendarSync(userId).catch((err) => {
      logger.error(
        `Something went wrong with resyncing google calendars for user: ${userId}`,
        err,
      );
    });

    res.status(Status.OK).send({ message: "Full sync in progress." });
  };

  private static handleMissingSyncToken = async (
    res: Response,
    channelId: string,
    resourceId: string,
  ): Promise<void> => {
    const _id = new ObjectId(channelId); // convert to ObjectId for find command
    const watch = await mongoService.watch.findOne({ _id, resourceId });

    if (!watch) {
      logger.warn(
        `Ignored missing sync token recovery because no watch was found for channelId: ${channelId}`,
      );
      res.status(Status.NO_CONTENT).send();
      return;
    }

    const { user: userId, gCalendarId } = watch;
    logger.warn("Recovering Google sync after missing sync token", {
      userId,
      gCalendarId,
      channelId,
      resourceId,
    });

    const metadata = await userMetadataService.fetchUserMetadata(
      userId,
      undefined,
      { skipAssessment: true },
    );
    const importStatus = metadata.sync?.importGCal;

    if (importStatus === "IMPORTING" || importStatus === "RESTART") {
      logger.info(
        `Skipped Google sync recovery because full import is already active for user: ${userId}`,
      );
      res.status(Status.NO_CONTENT).send();
      return;
    }

    // Force-restart sync to recover from invalid sync token.
    // When Google returns 410 (sync token invalid), the token may still exist
    // in the database but is no longer valid. assessGoogleMetadata checks token
    // existence, not validity, so we must force-restart directly.
    googleCalendarSyncService.repairGoogleCalendarSync(userId).catch((err) => {
      logger.error(
        `Something went wrong with recovering google calendars for user: ${userId}`,
        err,
      );
    });

    res.status(Status.NO_CONTENT).send();
  };

  private static handleGoogleApiError = async (
    res: Response,
    e: unknown,
    channelId: string,
    resourceId: string,
  ): Promise<void> => {
    const _id = new ObjectId(channelId);
    const watch = await mongoService.watch.findOne({ _id, resourceId });

    if (!watch) {
      throw error(
        WatchError.NoWatchRecordForUser,
        `Clean up failed because no watch record found for channel: ${channelId}`,
      );
    }

    const sync = await getSync({
      userId: watch.user,
      gCalendarId: watch.gCalendarId,
    });

    const userId = sync?.user;

    if (isInvalidGoogleToken(e)) {
      await SyncController.handleInvalidGoogleToken(res, channelId, userId);
    } else if (isFullSyncRequired(e) && userId) {
      SyncController.handleFullSyncRequired(res, userId);
    } else {
      res.status(Status.BAD_REQUEST).send("Google API error");
    }
  };

  static handleGoogleNotification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const channelId = req.headers["x-goog-channel-id"] as string;
    const resourceId = req.headers["x-goog-resource-id"] as string;

    try {
      const response = await googleWatchService.handleGoogleWatchNotification(
        publicWatchNotificationIngress.getNotification(res),
      );

      res.promise(response);
    } catch (e) {
      logger.error(e);

      if (isMissingGoogleRefreshToken(e)) {
        await SyncController.handleMissingRefreshToken(
          res,
          channelId,
          resourceId,
        );
        return;
      }

      if (isGoogleError(e)) {
        await SyncController.handleGoogleApiError(
          res,
          e,
          channelId,
          resourceId,
        );
        return;
      }

      if (
        e instanceof Error &&
        e.message === SyncError.NoSyncRecordForUser.description
      ) {
        logger.debug(res);
        res.status(Status.BAD_REQUEST).send(SyncError.NoSyncRecordForUser);
        return;
      }

      if (
        e instanceof Error &&
        e.message === SyncError.NoSyncToken.description
      ) {
        await SyncController.handleMissingSyncToken(res, channelId, resourceId);
        return;
      }

      logger.error("Not sure how to handle this error:");
      logger.error(e);
      next(e);
    }
  };

  static maintain = async (_req: Request, res: Response) => {
    try {
      // To avoid 504 timeouts on this long running endpoint
      // to support the reliance of the google cloud function
      // on the result of the sync maintenance call for notifications
      // we run the underlying sync logic for each user in parallel
      // to speed it up. If some of the syncs fail, investigate
      // Google API quota limits first.
      // We will also try to send a timeout response after 5 minutes
      res.setTimeout(5 * 60 * 1000, () => {
        if (res.headersSent) return;

        res.status(Status.GATEWAY_TIMEOUT).send({
          error:
            "Request timed out. Sync is still in progress, result unknown.",
        });
      }); // 5 minutes timeout

      const result = await googleWatchMaintenanceService.runMaintenance();

      if (!res.headersSent) res.promise(result);
    } catch (e) {
      logger.error(e);
      res.promise(e);
    }
  };

  static importGCal = (req: Request, res: Response): void => {
    const userId = req.session!.getUserId();
    const { force } = ImportGCalRequestSchema.parse(req.body);
    const isForce = force === true;

    const importPromise = isForce
      ? googleCalendarSyncService.repairGoogleCalendarSync(userId)
      : googleCalendarSyncService.startGoogleCalendarSyncIfNeeded(userId);

    importPromise.catch((err) => {
      logger.error(
        `Something went wrong starting Google Calendar import for user: ${userId}`,
        err,
      );
    });

    res.status(Status.NO_CONTENT).send();
  };
}

/**
 * Prunes Google data for a user and notifies connected clients.
 * Used when Google access has been revoked or refresh token is missing.
 */
const pruneAndNotifyGoogleRevoked = async (
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
