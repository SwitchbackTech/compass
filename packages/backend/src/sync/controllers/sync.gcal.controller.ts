import express from "express";
import {
  Body_Watch_Gcal_Start,
  Body_Watch_Gcal_Stop,
  Request_Sync_Gcal,
} from "@core/types/sync.types";
import { SReqBody, Res } from "@core/types/express.types";
import { Logger } from "@core/logger/winston.logger";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";

import syncService from "../services/sync.service";
import { hasExpectedHeaders } from "../services/sync.helpers";

const logger = Logger("app:sync.gcal");
class GcalSyncController {
  handleNotification = async (req: express.Request, res: express.Response) => {
    if (hasExpectedHeaders(req.headers)) {
      const params = {
        channelId: req.headers["x-goog-channel-id"],
        resourceId: req.headers["x-goog-resource-id"],
        resourceState: req.headers["x-goog-resource-state"],
        expiration: req.headers["x-goog-channel-expiration"],
      } as Request_Sync_Gcal;

      const notifResponse = await syncService.handleGcalNotification(params);

      // @ts-ignore
      res.promise(Promise.resolve(notifResponse));
    } else {
      const msg = `Notification request has invalid headers:\n${JSON.stringify(
        req.headers
      )}`;
      logger.error(msg);
      const err = new BaseError("Bad Headers", msg, Status.BAD_REQUEST, true);
      // @ts-ignore
      res.promise(Promise.resolve(err));
    }
  };

  startWatching = async (req: SReqBody<Body_Watch_Gcal_Start>, res: Res) => {
    try {
      const userId = res.locals.user.id;
      const calendarId = req.body.calendarId;
      const channelId = req.body.channelId;

      const gcal = await getGcalClient(userId);
      const watchResult = await syncService.startWatchingCalendar(
        gcal,
        userId,
        calendarId,
        channelId
      );

      // @ts-ignore
      res.promise(Promise.resolve(watchResult));
    } catch (e) {
      // @ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  stopAllChannelWatches = (req: express.Request, res: express.Response) => {
    try {
      //@ts-ignore
      const userId: string = req.params.userId;
      const stopResult = syncService.stopAllChannelWatches(userId);
      //@ts-ignore
      res.promise(Promise.resolve(stopResult));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  stopWatching = async (req: SReqBody<Body_Watch_Gcal_Stop>, res: Res) => {
    try {
      const userId = res.locals.user.id;
      const channelId = req.body.channelId;
      const resourceId = req.body.resourceId;

      const stopResult = await syncService.stopWatchingChannel(
        userId,
        channelId,
        resourceId
      );
      // @ts-ignore
      res.promise(Promise.resolve(stopResult));
    } catch (e) {
      // @ts-ignore
      res.promise(Promise.reject(e));
    }
  };
}

export default new GcalSyncController();
