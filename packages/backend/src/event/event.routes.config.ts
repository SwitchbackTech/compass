import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";

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
      .post(eventController.create);

    this.app
      .route(`/api/event/updateMany`)
      .all(verifySession())
      .post(eventController.updateMany);

    this.app
      .route(`/api/event/deleteMany`)
      .all(verifySession())
      .delete(eventController.deleteMany);

    /* 
    careful: this one's dangerous 
    */
    this.app
      .route(`/api/event/delete-all/:userId`)
      .all(verifySession())
      .delete(eventController.deleteAllByUser);

    this.app
      .route(`/api/event/:id`)
      .all(verifySession())
      .get(eventController.readById)
      .put(eventController.update)
      .delete(eventController.delete);

    // this.app
    //   .route(`/api/event/import`)
    //   .all(jwtMiddleware.verifyTokenAndSaveUserId)
    //   .post(eventController.reimport);

    return this.app;
  }
}
