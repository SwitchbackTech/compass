import express from "express";
import { Payload_Sync_Notif } from "@core/types/sync.types";
import { SessionRequest } from "supertokens-node/framework/express";
import { SReqBody, Res } from "@core/types/express.types";
import { Logger } from "@core/logger/winston.logger";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";

import { hasExpectedHeaders } from "../services/sync.utils";
import syncService from "../services/sync.service";

const logger = Logger("app:sync.gcal");
class GcalSyncController {
  handleNotification = async (req: express.Request, res: express.Response) => {
    if (hasExpectedHeaders(req.headers)) {
      const syncPayload = {
        channelId: req.headers["x-goog-channel-id"],
        resourceId: req.headers["x-goog-resource-id"],
        resourceState: req.headers["x-goog-resource-state"],
        expiration: req.headers["x-goog-channel-expiration"],
      } as Payload_Sync_Notif;

      const notifResponse = await syncService.handleGcalNotification(
        syncPayload
      );

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

  importIncremental = async (req: SessionRequest, res: Res_Promise) => {
    try {
      const userId = req.session?.getUserId() as string;
      const result = await syncService.importIncremental(userId);

      // @ts-ignore
      res.promise(Promise.resolve(result));
    } catch (e) {
      // @ts-ignore
      res.promise(Promise.reject({ error: e }));
    }
  };

  startEventWatch = async (req: SReqBody<{ calendarId: string }>, res: Res) => {
    try {
      const userId = req.session?.getUserId() as string;
      const calendarId = req.body.calendarId;

      const watchResult = await syncService.startWatchingGcal(
        userId,
        calendarId
      );

      // @ts-ignore
      res.promise(Promise.resolve(watchResult));
    } catch (e) {
      logger.error(e);
      // @ts-ignore
      // res.promise(Promise.reject({ error: e }));
      res.promise(Promise.reject(e));
    }
  };

  stopAllChannelWatches = async (
    req: SessionRequest,
    res: express.Response
  ) => {
    try {
      let userId: string;
      if (req.params["userId"]) {
        userId = req.params["userId"];
      } else {
        userId = req.session?.getUserId() as string;
      }

      const stopResult = await syncService.stopAllGcalEventWatches(userId);
      //@ts-ignore
      res.promise(Promise.resolve(stopResult));
    } catch (e) {
      const _e = e as BaseError;
      if (_e.statusCode === Status.GONE) {
        //@ts-ignore
        res.promise(Promise.resolve({}));
        return;
      }
      //@ts-ignore
      res.promise(Promise.reject({ error: e }));
    }
  };

  stopWatching = async (
    req: SReqBody<{ channelId: string; resourceId: string }>,
    res: Res
  ) => {
    try {
      const userId = req.session?.getUserId() as string;
      const channelId = req.body.channelId;
      const resourceId = req.body.resourceId;

      const stopResult = await syncService.stopWatch(
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
