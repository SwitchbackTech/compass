import express from "express";

import jwtMiddleware from "@auth/middleware/jwt.middleware";
import { validateIds } from "@common/middleware/mongo.validation.middleware";
import { CommonRoutesConfig } from "@common/common.routes.config";

import PriorityController from "./controllers/priority.controller";

export class PriorityRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "PriorityRoutes");
  }

  configureRoutes() {
    this.app
      .route(`/priority`)
      .all([jwtMiddleware.verifyTokenAndSaveUserId])
      .get(PriorityController.readAll)
      .post(PriorityController.create);

    this.app
      .route(`/priority/:id`)
      .all([jwtMiddleware.verifyTokenAndSaveUserId, validateIds])
      .get(PriorityController.readById)
      .put(PriorityController.update)
      .delete(PriorityController.delete);

    return this.app;
  }
}
