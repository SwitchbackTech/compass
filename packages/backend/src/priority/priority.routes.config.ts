import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { validateIdParam } from "@backend/common/middleware/mongo.validation.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";

import PriorityController from "./controllers/priority.controller";

export class PriorityRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "PriorityRoutes");
  }

  configureRoutes() {
    this.app
      .route(`/api/priority`)
      .all(verifySession())
      .get(PriorityController.readAll)
      .post(PriorityController.create);

    this.app
      .route(`/api/priority/:id`)
      .all([verifySession(), validateIdParam])
      .get(PriorityController.readById)
      .put(PriorityController.update)
      .delete(PriorityController.delete);

    return this.app;
  }
}
