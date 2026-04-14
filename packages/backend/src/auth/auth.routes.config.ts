import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import type express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import authController from "./controllers/auth.controller";
import authMiddleware from "./middleware/auth.middleware";

/**
 * Routes with the verifyIsDev middleware are
 * only available when running the app in dev,
 * as they are not called by production code.
 */
export class AuthRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "AuthRoutes");
  }

  configureRoutes(): express.Application {
    const requireSession = verifySession() as express.RequestHandler;

    this.app
      .route(`/api/auth/session`)
      .all(authMiddleware.verifyIsDev)
      .post((req, res) => {
        void authController.createSession(req, res);
      })
      .get(requireSession, (req, res) => {
        authController.getUserIdFromSession(req, res);
      });

    this.app
      .route(`/api/auth/google/connect`)
      .all(requireSession)
      .post((req, res) => {
        authController.connectGoogle(req, res);
      });

    return this.app;
  }
}
