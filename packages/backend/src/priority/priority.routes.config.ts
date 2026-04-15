import type express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { validateIdParam } from "@backend/common/middleware/mongo.validation.middleware";
import PriorityController from "./controllers/priority.controller";

export class PriorityRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "PriorityRoutes");
  }

  configureRoutes() {
    this.app
      .route(`/api/priority`)
      .all(verifySession())
      //@ts-expect-error
      .get(PriorityController.readAll)
      //@ts-expect-error
      .post(PriorityController.create);

    this.app
      .route(`/api/priority/:id`)
      .all([verifySession(), validateIdParam])
      //@ts-expect-error
      .get(PriorityController.readById)
      //@ts-expect-error
      .put(PriorityController.update)
      //@ts-expect-error
      .delete(PriorityController.delete);

    return this.app;
  }
}
