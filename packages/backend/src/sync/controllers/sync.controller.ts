import { Request, Response } from "express";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { Payload_Sync_Notif } from "@core/types/sync.types";
import { shouldImportGCal } from "@core/util/event/event.util";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { UserError } from "@backend/common/errors/user/user.errors";
import {
  isFullSyncRequired,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import syncService from "@backend/sync/services/sync.service";
import { getSync } from "@backend/sync/util/sync.queries";
import userService from "@backend/user/services/user.service";

const logger = Logger("app:sync.controller");

export class SyncController {
  static handleGoogleNotification = async (req: Request, res: Response) => {
    try {
      const syncPayload = {
        channelId: req.headers["x-goog-channel-id"],
        resourceId: req.headers["x-goog-resource-id"],
        resourceState: req.headers["x-goog-resource-state"],
        expiration: req.headers["x-goog-channel-expiration"],
      } as Payload_Sync_Notif;

      const response = await syncService.handleGcalNotification(syncPayload);

      res.promise(response);
    } catch (e) {
      const channelId = req.headers["x-goog-channel-id"] as string;
      const resourceId = req.headers["x-goog-resource-id"] as string;

      const sync = await getSync({ channelId, resourceId });
      if (!sync || !sync.user) {
        logger.error(
          `Sync error occurred, but couldnt find user based on this resourceId: ${resourceId}`,
        );
        logger.debug(res);
        res.status(Status.BAD_REQUEST).send(UserError.MissingUserIdField);
        return;
      }

      const userId = sync.user;

      if (isInvalidGoogleToken(e as Error)) {
        console.warn(`Cleaning data after this user revoked access: ${userId}`);
        await userService.deleteCompassDataForUser(sync.user, false);
        res.status(Status.GONE).send("User revoked access, deleted all data");
        return;

        const msg = `Ignored update due to revoked access for resourceId: ${JSON.stringify(
          resourceId,
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
        e.message === SyncError.NoSyncToken.description
      ) {
        logger.debug(
          `Ignored notification due to missing sync token for resourceId: ${resourceId}`,
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
