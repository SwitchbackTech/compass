import express from "express";

import { Logger } from "@common/logger/common.logger";
import { Body$StopNotif } from "@core/types/sync.types";
import { ReqBody } from "@core/types/express.types";

import syncService from "../services/sync.service";

const logger = Logger("app:sync.gcal.controller");

class GcalSyncController {
  handleNotification = async (req: express.Request, res: express.Response) => {
    const calendarId = req.headers["x-goog-channel-id"];
    const resourceId = req.headers["x-goog-resource-id"];
    const resourceState = req.headers["x-goog-resource-state"];
    const expiration = req.headers["x-goog-channel-expiration"];

    logger.debug("request:");
    logger.debug(req);

    const notifResponse = await syncService.syncGcalEvents(
      calendarId,
      resourceId,
      resourceState,
      expiration
    );
    res.promise(Promise.resolve(notifResponse));
  };

  stopWatching = async (req: ReqBody<Body$StopNotif>, res: Res) => {
    const userId = res.locals.user.id;
    const channelId = req.body.channelId;
    const resourceId = req.body.resourceId;

    logger.info(
      `Stopping watch for channel: ${channelId} and resource: ${resourceId}`
    );

    const stopResult = await syncService.stopWatchingChannel(
      userId,
      channelId,
      resourceId
    );
    //todo respond to the google api with success/failure
    // so google can decide to re-try if needed
    res.promise(Promise.resolve(stopResult));
  };
}

export default new GcalSyncController();
