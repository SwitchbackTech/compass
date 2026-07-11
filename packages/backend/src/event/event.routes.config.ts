import type express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import authMiddleware from "@backend/auth/middleware/auth.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import eventController from "./controllers/event.controller";

/**
 * Event Routes Configuration (B4). Strict-parsed at ingress with the core
 * event-command contracts; unknown/invalid input is rejected 400.
 */
export class EventRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "EventRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/api/event`)
      .all(verifySession())
      .get(eventController.readAll)
      .post(eventController.create);

    this.app
      .route(`/api/event/reorder`)
      .all(verifySession())
      .put(eventController.reorder);

    // Development only: bulk-delete a user's events.
    this.app
      .route(`/api/event/delete-all/:userId`)
      .all([verifySession(), authMiddleware.verifyIsDev])
      .delete(eventController.deleteAllByUser);

    this.app
      .route(`/api/event/:id/transition`)
      .all(verifySession())
      .post(eventController.transition);

    this.app
      .route(`/api/event/:id`)
      .all(verifySession())
      .get(eventController.readById)
      .put(eventController.replace)
      .delete(eventController.delete);

    return this.app;
  }
}
