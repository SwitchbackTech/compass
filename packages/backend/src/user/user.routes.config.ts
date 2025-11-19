import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import userController from "./controllers/user.controller";

export class UserRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "UserRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/api/user/profile`)
      .all(verifySession())
      .get(userController.getProfile);

    this.app
      .route(`/api/user/metadata`)
      .all(verifySession())
      .get(userController.getMetadata)
      .post(userController.updateMetadata);

    return this.app;
  }
}
