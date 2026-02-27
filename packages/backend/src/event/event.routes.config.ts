import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import authMiddleware from "@backend/auth/middleware/auth.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { requireGoogleConnectionSession } from "@backend/common/middleware/google.required.middleware";
import eventController from "./controllers/event.controller";

export class EventRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "EventRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/api/event`)
      .all(verifySession())
      .get(eventController.readAll)
      .post(requireGoogleConnectionSession, eventController.create);

    this.app
      .route(`/api/event/deleteMany`)
      .all(verifySession())
      .delete(eventController.deleteMany);

    this.app
      .route(`/api/event/reorder`)
      .all(verifySession())
      .put(eventController.reorder);

    this.app
      .route(`/api/event/delete-all/:userId`)
      .all([verifySession(), authMiddleware.verifyIsDev])
      .delete(eventController.deleteAllByUser);

    this.app
      .route(`/api/event/:id`)
      .all(verifySession())
      .get(eventController.readById)
      .put(requireGoogleConnectionSession, eventController.update)
      .delete(requireGoogleConnectionSession, eventController.delete);

    return this.app;
  }
}
