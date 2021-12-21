import express from "express";

import { Logger } from "@common/logger/common.logger";
import {
  Body_Watch_Gcal_Start,
  Body_Watch_Gcal_Stop,
} from "@core/types/sync.types";
import { ReqBody, Res } from "@core/types/express.types";
import { getGcal } from "@auth/services/google.auth.service";

import syncService from "../services/sync.service";

const logger = Logger("app:sync.gcal.controller");

class GcalSyncController {
  handleNotification = async (req: express.Request, res: express.Response) => {
    // hacky way to appease typescript, since these headers can also be string[]
    if (
      typeof req.headers["x-goog-channel-id"] === "string" &&
      typeof req.headers["x-goog-resource-id"] === "string" &&
      typeof req.headers["x-goog-resource-state"] === "string" &&
      typeof req.headers["x-goog-channel-expiration"] === "string"
    ) {
      const params = {
        channelId: req.headers["x-goog-channel-id"],
        resourceId: req.headers["x-goog-resource-id"],
        resourceState: req.headers["x-goog-resource-state"],
        expiration: req.headers["x-goog-channel-expiration"],
      };

      const notifResponse = await syncService.handleGcalNotification(params);

      res.promise(Promise.resolve(notifResponse));
    }
  };

  startWatching = async (req: ReqBody<Body_Watch_Gcal_Start>, res: Res) => {
    const userId = res.locals.user.id;
    const calendarId = req.body.calendarId;
    const channelId = req.body.channelId;

    const gcal = await getGcal(userId);
    const watchResult = await syncService.startWatchingChannel(
      gcal,
      calendarId,
      channelId
    );

    res.promise(Promise.resolve(watchResult));
  };

  stopWatching = async (req: ReqBody<Body_Watch_Gcal_Stop>, res: Res) => {
    const userId = res.locals.user.id;
    const channelId = req.body.channelId;
    const resourceId = req.body.resourceId;

    const stopResult = await syncService.stopWatchingChannel(
      userId,
      channelId,
      resourceId
    );
    res.promise(Promise.resolve(stopResult));
  };
}

export default new GcalSyncController();
