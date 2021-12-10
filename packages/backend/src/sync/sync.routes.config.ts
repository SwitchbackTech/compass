import express from "express";

import { CommonRoutesConfig } from "@common/common.routes.config";

import gcalSyncController from "./controllers/sync.gcal.controller";

export class SyncRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "SyncRoutes");
  }

  configureRoutes() {
    this.app
      .route(`/sync/gcal/notifications`)
      .post(gcalSyncController.handleNotification);

    return this.app;
  }
}
