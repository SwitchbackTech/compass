import express from "express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import jwtMiddleware from "@backend/auth/middleware/jwt.middleware";

import devController from "./controllers/dev.controller";

export class DevRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "DevRoutes");
  }

  configureRoutes() {
    this.app
      .route(`/dev/sync/stop/:userId`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .post(devController.stopAllChannelWatches);

    return this.app;
  }
}
