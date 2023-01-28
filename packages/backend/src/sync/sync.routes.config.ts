import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import authMiddleware from "@backend/auth/middleware/auth.middleware";

import syncController from "./controllers/sync.controller";
import gcalSyncController from "./controllers/sync.gcal.controller";

export class SyncRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "SyncRoutes");
  }

  configureRoutes() {
    this.app
      .route(GCAL_NOTIFICATION_ENDPOINT)
      .post([
        authMiddleware.verifyIsFromGoogle,
        gcalSyncController.handleNotification,
      ]);

    this.app
      .route(`/api/sync/maintain/:userId`)
      .post([
        authMiddleware.verifyIsFromCompass,
        syncController.maintainForUser,
      ]);

    this.app
      .route(`/api/sync/maintain-all`)
      .post([authMiddleware.verifyIsFromCompass, syncController.maintain]);

    this.app
      .route([
        `${GCAL_NOTIFICATION_ENDPOINT}/stop-all`,
        `${GCAL_NOTIFICATION_ENDPOINT}/stop-all/:userId`,
      ])
      .all(verifySession())
      .post(gcalSyncController.stopAllChannelWatches);

    /**
     * Dev convenience routes
     */
    this.app
      .route(`${GCAL_NOTIFICATION_ENDPOINT}/start`)
      .all([authMiddleware.verifyIsDev, verifySession()])
      .post(gcalSyncController.startEventWatch);

    this.app
      .route(`${GCAL_NOTIFICATION_ENDPOINT}/stop`)
      .all([authMiddleware.verifyIsDev, verifySession()])
      .post(gcalSyncController.stopWatching);

    this.app
      .route(`/api/sync/gcal/incremental`)
      .all([authMiddleware.verifyIsDev, verifySession()])
      .post(gcalSyncController.importIncremental);

    return this.app;
  }
}
