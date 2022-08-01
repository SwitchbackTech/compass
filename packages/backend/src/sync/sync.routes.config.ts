import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { GCAL_NOTIFICATION_URL } from "@backend/common/constants/backend.constants";
import authMiddleware from "@backend/auth/middleware/auth.middleware";

import gcalSyncController from "./controllers/sync.gcal.controller";

export class SyncRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "SyncRoutes");
  }

  configureRoutes() {
    this.app
      .route(GCAL_NOTIFICATION_URL)
      .post(gcalSyncController.handleNotification);

    //--add these after its working
    // this.app
    //   .route(`${GCAL_NOTIFICATION_URL}/start`)
    //   .all(verifySession())
    //   .post(gcalSyncController.startEventWatch);

    // this.app
    //   .route(`${GCAL_NOTIFICATION_URL}/stop`)
    //   .all([authMiddleware.verifyIsDev, verifySession()])
    //   .post(gcalSyncController.stopWatching);

    this.app
      .route(`${GCAL_NOTIFICATION_URL}/stop-all/:userId`)
      .all([authMiddleware.verifyIsDev, verifySession()])
      .post(gcalSyncController.stopAllChannelWatches);

    return this.app;
  }
}
