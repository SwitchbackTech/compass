import { Request, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { SReqBody } from "@core/types/express.types";
import { BaseError } from "@core/errors/errors.base";

import syncService from "../services/sync.service";
import { getSync } from "../util/sync.queries";

class SyncDebugController {
  importIncremental = async (req: SessionRequest, res: Response) => {
    try {
      const userId = req.session?.getUserId() as string;
      const result = await syncService.importIncremental(userId);

      // @ts-ignore
      res.promise(Promise.resolve(result));
    } catch (e) {
      // @ts-ignore
      res.promise(e);
    }
  };

  maintainByUser = async (req: Request, res: Response) => {
    try {
      const userId = req.params["userId"];
      if (!userId) {
        //@ts-ignore
        res.promise(Promise.reject({ error: "no userId param" }));
        return;
      }

      const dry = req.query["dry"] === "true";
      if (dry === undefined) {
        //@ts-ignore
        res.promise(Promise.reject({ error: "missing queries" }));
        return;
      }

      const result = await syncService.runMaintenanceByUser(userId, {
        dry,
      });

      //@ts-ignore
      res.promise(Promise.resolve(result));
    } catch (e) {
      //@ts-ignore
      res.promise(e);
    }
  };

  refreshEventWatch = async (req: SessionRequest, res: Response) => {
    const userId = req.params["userId"];
    if (userId === undefined) {
      //@ts-ignore
      res.promise({ error: "No userId" });
      return;
    }

    const sync = await getSync({ userId });

    if (!sync) {
      //@ts-ignore
      res.promise({ error: `No sync for user: ${userId}` });
      return;
    }

    //@ts-ignore
    res.promise(sync);
  };

  startEventWatch = async (
    req: SReqBody<{ calendarId: string }>,
    res: Response
  ) => {
    try {
      const userId = req.session?.getUserId() as string;
      const calendarId = req.body.calendarId;

      const watchResult = await syncService.startWatchingGcalEvents(userId, {
        gCalendarId: calendarId,
      });

      // @ts-ignore
      res.promise(Promise.resolve(watchResult));
    } catch (e) {
      // @ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  stopAllChannelWatches = async (req: SessionRequest, res: Response) => {
    try {
      let userId: string;
      if (req.params["userId"]) {
        userId = req.params["userId"];
      } else {
        userId = req.session?.getUserId() as string;
      }

      const stopResult = await syncService.stopWatches(userId);
      //@ts-ignore
      res.promise(Promise.resolve(stopResult));
    } catch (e) {
      const _e = e as BaseError;
      //@ts-ignore
      res.promise(Promise.resolve({ error: _e }));
    }
  };

  stopWatching = async (
    req: SReqBody<{ channelId: string; resourceId: string }>,
    res: Response
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

export default new SyncDebugController();
