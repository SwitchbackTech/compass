import express from "express";

import syncService from "../services/sync.service";

class GcalSyncController {
  handleNotification = async (req: express.Request, res: express.Response) => {
    // Capture the essentials //
    const calendarId = req.headers["x-goog-channel-id"];
    const resourceId = req.headers["x-goog-resource-id"];
    const resourceState = req.headers["x-goog-resource-state"];
    const expiration = req.headers["x-goog-channel-expiration"];

    const notifResponse = await syncService.syncGcalEvents(
      calendarId,
      resourceId,
      resourceState,
      expiration
    );
    res.promise(Promise.resolve(notifResponse));
  };
}

export default new GcalSyncController();
