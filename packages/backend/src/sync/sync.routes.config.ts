import express from "express";

import { CommonRoutesConfig } from "@common/common.routes.config";
import { GCAL_NOTIFICATION_URL } from "@common/constants/backend.constants";
import jwtMiddleware from "@auth/middleware/jwt.middleware";

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
      .route(`${GCAL_NOTIFICATION_URL}/stop`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .post(gcalSyncController.stopWatching);

    this.app
      .route(`${GCAL_NOTIFICATION_URL}/start`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .post(gcalSyncController.startWatching);

    return this.app;
  }
}
