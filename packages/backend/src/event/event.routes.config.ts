import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import authMiddleware from "@backend/auth/middleware/auth.middleware";

import eventController from "./controllers/event.controller";

export class EventRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "EventRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/api/event`)
      .all(verifySession())
      //@ts-ignore
      .get(eventController.readAll)
      //@ts-ignore
      .post(eventController.create);

    this.app
      .route(`/api/event/deleteMany`)
      .all(verifySession())
      //@ts-ignore
      .delete(eventController.deleteMany);

    this.app
      .route(`/api/event/reorder`)
      .all(verifySession())
      //@ts-ignore
      .put(eventController.reorder);

    // this.app.route(`/api/event/updateMany`).all(verifySession());
    //@ts-ignore
    // .post(eventController.updateMany);

    this.app
      .route(`/api/event/delete-all/:userId`)
      .all([verifySession(), authMiddleware.verifyIsDev])
      //@ts-ignore
      .delete(eventController.deleteAllByUser);

    this.app
      .route(`/api/event/:id`)
      .all(verifySession())
      //@ts-ignore
      .get(eventController.readById)
      //@ts-ignore
      .put(eventController.update)
      //@ts-ignore
      .delete(eventController.delete);

    return this.app;
  }
}
