import { Request, Response } from "express";

import syncService from "../services/sync.service";

class SyncController {
  maintain = async (_req: Request, res: Response) => {
    try {
      const result = await syncService.runSyncMaintenance();
      //@ts-ignore
      res.promise(Promise.resolve(result));
    } catch (e) {
      //@ts-ignore
      res.promise(e);
    }
  };

  maintainForUser = async (req: Request, res: Response) => {
    try {
      const userId = req.params["userId"];
      if (!userId) {
        //@ts-ignore
        res.promise(Promise.reject({ error: "no userId param" }));
        return;
      }
      const result = await syncService.runSyncMaintenanceForUser(userId);
      //@ts-ignore
      res.promise(Promise.resolve(result));
    } catch (e) {
      //@ts-ignore
      res.promise(e);
    }
  };
}

export default new SyncController();
