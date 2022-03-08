import express from "express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import jwtMiddleware from "@backend/auth/middleware/jwt.middleware";

import eventController from "./controllers/event.controller";

export class EventRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "EventRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/api/event`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .get(eventController.readAll)
      .post(eventController.create);

    this.app
      .route(`/api/event/updateMany`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .post(eventController.updateMany);

    this.app
      .route(`/api/event/deleteMany`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .delete(eventController.deleteMany);

    /* 
    this one's so dangerous that it's commented out
    only enabled on an as-needed basis
    this.app
    .route(`/api/event/delete-all/:userId`)
    .all(jwtMiddleware.verifyTokenAndSaveUserId)
    .delete(eventController.deleteAllByUser);
    */

    this.app
      .route(`/api/event/import`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .post(eventController.import);

    this.app
      .route(`/api/event/:id`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .get(eventController.readById)
      .put(eventController.update)
      .delete(eventController.delete);
    return this.app;
  }
}
