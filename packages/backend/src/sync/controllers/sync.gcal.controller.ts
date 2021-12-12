import express from "express";

import { Logger } from "@common/logger/common.logger";

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

  stopWatching = async (req: express.Request, res: express.Response) => {
    logger.info(`Stopping watch for channel: `);
    const channelId = "123";
    const resourceId = "456";
    const stopResult = await syncService.stopWatchingChannel(
      channelId,
      resourceId
    );
    res.promise(Promise.resolve(stopResult));
  };
}

export default new GcalSyncController();
