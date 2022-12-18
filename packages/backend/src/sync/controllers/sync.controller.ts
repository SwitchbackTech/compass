import { Request, Response } from "express";

import syncService from "../services/sync.service";

class SyncController {
  maintain = async (_req: Request, res: Response) => {
    const result = await syncService.runSyncMaintenance();
    //@ts-ignore
    res.promise(Promise.resolve(result));
    //++ skipped catch so express.handler can process it
    //   try {
    //   } catch (e) {
    //     //@ts-ignore
    //     res.promise(Promise.resolve({ error: e }));
    //   }
  };
}

export default new SyncController();
