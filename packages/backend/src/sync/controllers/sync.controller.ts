import { Request, Response } from "express";
import { Payload_Sync_Notif } from "@core/types/sync.types";
import { Logger } from "@core/logger/winston.logger";
import { Status } from "@core/errors/status.codes";
import { isAccessRevoked } from "@backend/common/services/gcal/gcal.utils";
import userService from "@backend/user/services/user.service";

import { getSync } from "../util/sync.queries";
import syncService from "../services/sync.service";

const logger = Logger("app:sync.controller");
class SyncController {
  handleGoogleNotification = async (req: Request, res: Response) => {
    try {
      const syncPayload = {
        channelId: req.headers["x-goog-channel-id"],
        resourceId: req.headers["x-goog-resource-id"],
        resourceState: req.headers["x-goog-resource-state"],
        expiration: req.headers["x-goog-channel-expiration"],
      } as Payload_Sync_Notif;

      const response = await syncService.handleGcalNotification(syncPayload);

      // @ts-ignore
      res.promise(Promise.resolve(response));
    } catch (e) {
      const resourceId = req.headers["x-goog-resource-id"] as string;

      if (isAccessRevoked(e as Error)) {
        const sync = await getSync({ resourceId });
        const userExists = sync !== null;
        if (userExists) {
          console.warn(
            `User revoked access, cleaning data for resourceId: ${resourceId}`
          );
          await userService.deleteCompassDataForUser(sync.user, false);
          res.status(Status.GONE).send("User revoked access, deleted all data");
          return;
        }

        const msg = `Ignored update due to revoked access for resourceId: ${resourceId}
        `;
        console.warn(msg);

        res.status(Status.GONE).send(msg);
        return;
      } else {
        logger.error("Not sure how to handle this error:");
        logger.error(e);
      }
      // @ts-ignore
      res.promise(e);
    }
  };
  maintain = async (_req: Request, res: Response) => {
    try {
      const result = await syncService.runMaintenance();
      //@ts-ignore
      res.promise(Promise.resolve(result));
    } catch (e) {
      //@ts-ignore
      res.promise(e);
    }
  };
}

export default new SyncController();
