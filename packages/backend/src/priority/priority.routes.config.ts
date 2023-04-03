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
      //@ts-ignore
      .get(PriorityController.readAll)
      //@ts-ignore
      .post(PriorityController.create);

    this.app
      .route(`/api/priority/:id`)
      .all([verifySession(), validateIdParam])
      //@ts-ignore
      .get(PriorityController.readById)
      //@ts-ignore
      .put(PriorityController.update)
      //@ts-ignore
      .delete(PriorityController.delete);

    return this.app;
  }
}
