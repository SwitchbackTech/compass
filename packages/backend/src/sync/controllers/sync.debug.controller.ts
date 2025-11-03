import { Request, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { BaseError } from "@core/errors/errors.base";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Res_Promise, SReqBody } from "@backend/common/types/express.types";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { zObjectId } from "../../../../core/src/types/type.utils";
import syncService from "../services/sync.service";
import { getSync } from "../util/sync.queries";

class SyncDebugController {
  dispatchEventToClient = (_req: Request, res: Response) => {
    try {
      const userId = process.env["SOCKET_USER"];
      if (!userId) {
        throw new Error("No demo user");
      }
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);

      webSocketServer.handleBackgroundCalendarChange(userId);
      res.sendStatus(200);
    } catch (e) {
      console.error("Error during dispatch:", e);
      res.status(500).send("An error occurred while processing your request.");
    }
  };

  importIncremental = async (req: SessionRequest, res: Res_Promise) => {
    const userId = zObjectId.parse(req.params["userId"], {
      error: () => "no userId param",
    });

    const result = await syncService.importIncremental(userId);

    res.promise(result);
  };

  maintainByUser = async (req: Request, res: Res_Promise) => {
    try {
      const userId = zObjectId.parse(req.params["userId"], {
        error: () => "no userId param",
      });

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

    const sync = await getSync({ user: userId });

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
      const userId = zObjectId.parse(req.session?.getUserId());
      const calendarId = req.body.calendarId;
      const gcal = await getGcalClient(userId);

      const watchResult = await syncService.startWatchingGcalEvents(
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
      const userId = zObjectId.parse(
        req.params["userId"] ?? req.session?.getUserId(),
        { error: () => "no userId param" },
      );

      const stopResult = await syncService.stopWatches(userId);
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
      const userId = zObjectId.parse(req.session?.getUserId());
      const channelId = req.body.channelId;
      const resourceId = req.body.resourceId;

      const stopResult = await syncService.stopWatch(
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
