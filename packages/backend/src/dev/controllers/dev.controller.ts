import express from "express";
import devService from "@backend/dev/services/dev.service";

class DevController {
  stopAllChannelWatches = (req: express.Request, res: express.Response) => {
    try {
      //@ts-ignore
      const userId: string = req.params.userId;
      const stopResult = devService.stopAllChannelWatches(userId);
      //@ts-ignore
      res.promise(Promise.resolve(stopResult));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };
}

export default new DevController();
