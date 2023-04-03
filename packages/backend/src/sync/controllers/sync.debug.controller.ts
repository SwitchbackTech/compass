import { Request } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { BaseError } from "@core/errors/errors.base";
import { Res_Promise, SReqBody } from "@backend/common/types/express.types";

import syncService from "../services/sync.service";
import { getSync } from "../util/sync.queries";

class SyncDebugController {
  importIncremental = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.params["userId"];
    if (!userId) {
      res.promise(Promise.reject({ error: "no userId param" }));
      return;
    }
    const result = await syncService.importIncremental(userId);

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

      const result = await syncService.runMaintenanceByUser(userId, {
        dry,
      });

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
    res: Res_Promise
  ) => {
    try {
      const userId = req.session?.getUserId() as string;
      const calendarId = req.body.calendarId;

      const watchResult = await syncService.startWatchingGcalEvents(userId, {
        gCalendarId: calendarId,
      });

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

      const stopResult = await syncService.stopWatches(userId);
      res.promise(stopResult);
    } catch (e) {
      const _e = e as BaseError;
      res.promise(Promise.resolve({ error: _e }));
    }
  };

  stopWatching = async (
    req: SReqBody<{ channelId: string; resourceId: string }>,
    res: Res_Promise
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

      res.promise(stopResult);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };
}

export default new SyncDebugController();
