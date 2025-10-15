import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { COMPASS_RESOURCE_HEADER } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { Payload_Sync_Notif, Resource_Sync } from "@core/types/sync.types";
import { shouldImportGCal } from "@core/util/event/event.util";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import {
  isFullSyncRequired,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import syncService from "@backend/sync/services/sync.service";
import { getSync } from "@backend/sync/util/sync.queries";
import userService from "@backend/user/services/user.service";
import mongoService from "../../common/services/mongo.service";

const logger = Logger("app:sync.controller");

export class SyncController {
  static handleGoogleNotification = async (req: Request, res: Response) => {
    const resource = res.getHeader(COMPASS_RESOURCE_HEADER) as Exclude<
      Resource_Sync,
      Resource_Sync.SETTINGS
    >;

    res.removeHeader(COMPASS_RESOURCE_HEADER);

    try {
      const syncPayload: Payload_Sync_Notif = {
        resource,
        channelId: req.headers["x-goog-channel-id"] as string,
        resourceId: req.headers["x-goog-resource-id"] as string,
        resourceState: req.headers["x-goog-resource-state"] as string,
        expiration: req.headers["x-goog-channel-expiration"] as string,
      };

      const response = await syncService.handleGcalNotification(syncPayload);

      res.promise(response);
    } catch (e) {
      const channelId = req.headers["x-goog-channel-id"] as string;
      const resourceId = req.headers["x-goog-resource-id"] as string;

      if (isInvalidGoogleToken(e as Error)) {
        const _id = new ObjectId(channelId);
        const watch = await mongoService.watch.findOne({ _id, resourceId });
        const sync = watch?.user
          ? await getSync({
              userId: watch.user,
              gCalendarId: watch.gCalendarId,
            })
          : undefined;

        const userId = sync?.user;

        if (userId) {
          console.warn(
            `Cleaning data after this user revoked access: ${userId}`,
          );
          await userService.deleteCompassDataForUser(userId, false);
        }

        res.status(Status.GONE).send("User revoked access, deleted all data");
        return;

        const msg = `Ignored update due to revoked access for channelId: ${JSON.stringify(
          channelId,
        )}
        `;
        console.warn(msg);

        res.status(Status.GONE).send(msg);
        return;
      }

      if (isFullSyncRequired(e as Error)) {
        return SyncController.importGCal(req, res);
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
      res.promise(e);
    }
  };

  static maintain = async (_req: Request, res: Response) => {
    try {
      const result = await syncService.runMaintenance();
      res.promise(result);
    } catch (e) {
      logger.error(e);
      res.promise(e);
    }
  };

  static importGCal = async (req: Request, res: Response) => {
    const userId = req.session!.getUserId()!;

    webSocketServer.handleImportGCalStart(userId);

    userService
      .fetchUserMetadata(userId)
      .then(shouldImportGCal)
      .then(async (proceed) => {
        if (!proceed) {
          webSocketServer.handleImportGCalEnd(
            userId,
            `User ${userId} gcal import is in progress or completed, ignoring this request`,
          );

          return;
        }

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "importing" } },
        });

        await userService.reSyncGoogleData(userId);

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "completed" } },
        });

        webSocketServer.handleImportGCalEnd(userId);
        webSocketServer.handleBackgroundCalendarChange(userId);
      })
      .catch(async (err) => {
        const message = `Import gCal failed for user: ${userId}`;

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "errored" } },
        });

        webSocketServer.handleImportGCalEnd(userId, message);

        logger.error(message, err);
      });

    res.status(Status.NO_CONTENT).send();
  };
}
