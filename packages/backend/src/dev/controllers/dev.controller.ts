import express from "express";

import devService from "@backend/dev/services/dev.service";

class DevController {
  stopAllChannelWatches = async (
    req: express.Request,
    res: express.Response
  ) => {
    const userId: string = req.params.userId;
    const stopResult = devService.stopAllChannelWatches(userId);
    res.promise(Promise.resolve(stopResult));
  };
}

export default new DevController();
