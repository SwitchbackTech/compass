import express from "express";
import {
  GCAL_NOTIFICATION_ENDPOINT,
  SYNC_DEBUG,
} from "@core/constants/core.constants";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import authMiddleware from "@backend/auth/middleware/auth.middleware";
import { verifySession } from "supertokens-node/recipe/session/framework/express";

import syncController from "./controllers/sync.controller";
import syncDebugController from "./controllers/sync.debug.controller";

export class SyncRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "SyncRoutes");
  }

  configureRoutes() {
    /***************
     * PROD ROUTES
     ***************/
    this.app
      .route(GCAL_NOTIFICATION_ENDPOINT)
      .post([
        authMiddleware.verifyIsFromGoogle,
        syncController.handleGoogleNotification,
      ]);

    this.app
      .route(`/api/sync/maintain-all`)
      .post([authMiddleware.verifyIsFromCompass, syncController.maintain]);

    this.app
      .route([`/api/sync/stop-all`])
      .post([verifySession(), syncDebugController.stopAllChannelWatches]);

    /***************
     * DEBUG ROUTES
     ***************/

    this.app
      .route(`${SYNC_DEBUG}/import-incremental`)
      .post([
        authMiddleware.verifyIsFromCompass,
        syncDebugController.importIncremental,
      ]);

    this.app
      .route(`${SYNC_DEBUG}/maintain/:userId`)
      .post([
        authMiddleware.verifyIsFromCompass,
        syncDebugController.maintainByUser,
      ]);

    this.app
      .route(`${SYNC_DEBUG}/refresh/:userId`)
      .post([
        authMiddleware.verifyIsFromCompass,
        syncDebugController.refreshEventWatch,
      ]);

    this.app
      .route(`${SYNC_DEBUG}/start`)
      .post([
        authMiddleware.verifyIsFromCompass,
        syncDebugController.startEventWatch,
      ]);

    this.app
      .route(`${SYNC_DEBUG}/stop`)
      .post([
        authMiddleware.verifyIsFromCompass,
        syncDebugController.stopWatching,
      ]);

    this.app
      .route(`${SYNC_DEBUG}/stop-all/:userId`)
      .post([
        authMiddleware.verifyIsFromCompass,
        syncDebugController.stopAllChannelWatches,
      ]);

    return this.app;
  }
}
