import { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { ZodError } from "zod/v4";
import { COMPASS_RESOURCE_HEADER } from "@core/constants/core.constants";
import { GOOGLE_REVOKED } from "@core/constants/websocket.constants";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import {
  GcalNotificationSchema,
  Payload_Sync_Notif,
  Resource_Sync,
} from "@core/types/sync.types";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import {
  isFullSyncRequired,
  isGoogleError,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import syncService from "@backend/sync/services/sync.service";
import { getSync } from "@backend/sync/util/sync.queries";
import userService from "@backend/user/services/user.service";

const logger = Logger("app:sync.controller");

export class SyncController {
  static handleGoogleNotification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const resource = res.getHeader(COMPASS_RESOURCE_HEADER) as Exclude<
      Resource_Sync,
      Resource_Sync.SETTINGS
    >;

    const channelId = req.headers["x-goog-channel-id"] as string;

    res.removeHeader(COMPASS_RESOURCE_HEADER);

    try {
      const syncPayload: Payload_Sync_Notif = GcalNotificationSchema.parse({
        resource,
        channelId,
        resourceId: req.headers["x-goog-resource-id"] as string,
        resourceState: req.headers["x-goog-resource-state"] as string,
        expiration: new Date(
          req.headers["x-goog-channel-expiration"] as string,
        ),
      });

      const response = await syncService.handleGcalNotification(syncPayload);

      res.promise(response);
    } catch (e) {
      logger.error(e);
      const resourceId = req.headers["x-goog-resource-id"] as string;

      if (e instanceof ZodError) {
        logger.error(e);
        res.status(Status.FORBIDDEN).send("Invalid notification payload");
        return;
      }

      if (isGoogleError(e)) {
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
          if (userId) {
            logger.warn(
              `Cleaning data after this user revoked access: ${userId}`,
            );

            await userService.pruneGoogleData(userId);
            webSocketServer.handleGoogleRevoked(userId);

            res.status(Status.GONE).send({
              code: GOOGLE_REVOKED,
              message: "User revoked access, pruned Google data",
            });

            return;
          }

          const msg = `Ignored update due to revoked access for channelId: ${channelId}`;

          logger.warn(msg);

          res.status(Status.GONE).send(msg);

          return;
        } else if (isFullSyncRequired(e as Error) && userId) {
          // do not await this call
          userService
            .restartGoogleCalendarSync(userId, { force: true })
            .catch((err) => {
              logger.error(
                `Something went wrong with resyncing google calendars for user: ${userId}`,
                err,
              );
            });

          res.status(Status.OK).send({ message: "Full sync in progress." });

          return;
        } else {
          res.status(Status.BAD_REQUEST).send("Google API error");
          return;
        }
      }

      if (
        e instanceof Error &&
        e.message === SyncError.NoSyncRecordForUser.description
      ) {
        logger.error(e);
        logger.debug(res);
        res.status(Status.BAD_REQUEST).send(SyncError.NoSyncRecordForUser);
        return;
      }

      if (
        e instanceof Error &&
        e.message === SyncError.NoSyncToken.description
      ) {
        logger.debug(
          `Ignored notification due to missing sync token for channelId: ${channelId}`,
        );
        // returning 204 instead of 500 so client doesn't
        // attempt to retry
        res.status(Status.NO_CONTENT).send();
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
      // on the result of the syncService.runMaintenance call for notifications
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

      const result = await syncService.runMaintenance();

      if (!res.headersSent) res.promise(result);
    } catch (e) {
      logger.error(e);
      res.promise(e);
    }
  };

  static importGCal = async (req: Request, res: Response) => {
    const userId = req.session!.getUserId()!;

    userService.restartGoogleCalendarSync(userId);

    res.status(Status.NO_CONTENT).send();
  };
}
