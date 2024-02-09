import { Request } from "express";
import { Payload_Sync_Notif } from "@core/types/sync.types";
import { Logger } from "@core/logger/winston.logger";
import { Status } from "@core/errors/status.codes";
import {
  isInvalidGoogleToken,
  isFullSyncRequired,
} from "@backend/common/services/gcal/gcal.utils";
import userService from "@backend/user/services/user.service";
import { UserError } from "@backend/common/constants/error.constants";
import { Res_Promise } from "@backend/common/types/express.types";

import { getSync } from "../util/sync.queries";
import syncService from "../services/sync.service";

const logger = Logger("app:sync.controller");
class SyncController {
  handleGoogleNotification = async (req: Request, res: Res_Promise) => {
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
      const resourceId = req.headers["x-goog-resource-id"] as string;
      const sync = await getSync({ resourceId });
      if (!sync || !sync.user) {
        logger.error(
          `Sync error occured, but couldnt find user based on this resourceId: ${resourceId}`
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
          resourceId
        )}
        `;
        console.warn(msg);

        res.status(Status.GONE).send(msg);
        return;
      }

      if (isFullSyncRequired(e as Error)) {
        const result = await userService.reSyncGoogleData(userId);
        res.status(Status.OK).send(result);
        return;
      }

      logger.error("Not sure how to handle this error:");
      logger.error(e);
      res.promise(e);
    }
  };

  maintain = async (_req: Request, res: Res_Promise) => {
    try {
      const result = await syncService.runMaintenance();
      res.promise(result);
    } catch (e) {
      logger.error(e);
      res.promise(e);
    }
  };
}

export default new SyncController();
