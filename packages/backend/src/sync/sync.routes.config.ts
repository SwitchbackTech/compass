import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { GCAL_NOTIFICATION_URL } from "@backend/common/constants/backend.constants";

import gcalSyncController from "./controllers/sync.gcal.controller";

export class SyncRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "SyncRoutes");
  }

  configureRoutes() {
    this.app
      .route(GCAL_NOTIFICATION_URL)
      .post(gcalSyncController.handleNotification);

    this.app
      .route(`${GCAL_NOTIFICATION_URL}/start`)
      .all(verifySession())
      .post(gcalSyncController.startWatching);

    this.app
      .route(`${GCAL_NOTIFICATION_URL}/stop`)
      .all(verifySession())
      .post(gcalSyncController.stopWatching);

    this.app
      .route(`${GCAL_NOTIFICATION_URL}/stop-all/:userId`)
      .all(verifySession())
      .post(gcalSyncController.stopAllChannelWatches);

    return this.app;
  }
}
