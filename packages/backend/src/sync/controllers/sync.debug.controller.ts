import { type Request, type Response } from "express";
import { type SessionRequest } from "supertokens-node/framework/express";
import { type BaseError } from "@core/errors/errors.base";
import {
  type Res_Promise,
  type SReqBody,
} from "@backend/common/types/express.types";
import { sseServer } from "@backend/servers/sse/sse.server";
import { getGcalClient } from "@backend/sync/services/google-sync/gcal.client";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import { getSync } from "@backend/sync/services/records/sync-records.repository";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import { googleWatchMaintenanceService } from "@backend/sync/services/watch/google-watch-maintenance.service";

class SyncDebugController {
  dispatchEventToClient = (_req: Request, res: Response) => {
    try {
      const userId = process.env["SSE_DEBUG_USER"];
      if (!userId) {
        throw new Error("No demo user");
      }
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);

      sseServer.handleBackgroundCalendarChange(userId);
      res.sendStatus(200);
    } catch (e) {
      console.error("Error during dispatch:", e);
      res.status(500).send("An error occurred while processing your request.");
    }
  };

  importLatestGoogleCalendarChanges = async (
    req: SessionRequest,
    res: Res_Promise,
  ) => {
    const userId = req.params["userId"];
    if (!userId) {
      res.promise(Promise.reject({ error: "no userId param" }));
      return;
    }
    const result =
      await googleCalendarSyncService.importLatestGoogleCalendarChanges(userId);

    res.promise(result);
  };

  maintainByUser = async (req: Request, res: Res_Promise) => {
    try {
      const userId = req.params["userId"];
      if (!userId) {
        res.promise(Promise.reject({ error: "no userId param" }));
        return;
      }

      const dry = req.query["dry"] === "true";
      if (dry === undefined) {
        res.promise(Promise.reject({ error: "missing queries" }));
        return;
      }

      const result = await googleWatchMaintenanceService.runMaintenanceByUser(
        userId,
        {
          dry,
        },
      );

      res.promise(result);
    } catch (e) {
      res.promise(e);
    }
  };

  refreshEventWatch = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.params["userId"];
    if (userId === undefined) {
      res.promise({ error: "No userId" });
      return;
    }

    const sync = await getSync({ userId });

    if (!sync) {
      res.promise({ error: `No sync for user: ${userId}` });
      return;
    }

    res.promise(sync);
  };

  startEventWatch = async (
    req: SReqBody<{ calendarId: string }>,
    res: Res_Promise,
  ) => {
    try {
      const userId = req.session?.getUserId() as string;
      const calendarId = req.body.calendarId;
      const gcal = await getGcalClient(userId);

      const watchResult = await googleWatchService.startEventWatch(
        userId,
        {
          gCalendarId: calendarId,
        },
        gcal,
      );

      res.promise(watchResult);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  stopAllChannelWatches = async (req: SessionRequest, res: Res_Promise) => {
    try {
      let userId: string;
      if (req.params["userId"]) {
        userId = req.params["userId"];
      } else {
        userId = req.session?.getUserId() as string;
      }

      const stopResult = await googleWatchService.stopWatches(userId);
      res.promise(stopResult);
    } catch (e) {
      const _e = e as BaseError;
      res.promise(Promise.resolve({ error: _e }));
    }
  };

  stopWatching = async (
    req: SReqBody<{ channelId: string; resourceId: string }>,
    res: Res_Promise,
  ) => {
    try {
      const userId = req.session?.getUserId() as string;
      const channelId = req.body.channelId;
      const resourceId = req.body.resourceId;

      const stopResult = await googleWatchService.stopWatch(
        userId,
        channelId,
        resourceId,
      );

      res.promise(stopResult);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };
}

export default new SyncDebugController();
