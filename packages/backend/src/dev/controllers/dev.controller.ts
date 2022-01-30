import express from "express";

import devService from "@backend/dev/services/dev.service";

class DevController {
  stopAllChannelWatches = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const userId: string = req.params.userId;
      const stopResult = devService.stopAllChannelWatches(userId);
      res.promise(Promise.resolve(stopResult));
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };
}

export default new DevController();
