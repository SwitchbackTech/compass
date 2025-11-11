import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
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
    this.app
      .route(`/api/auth/session`)
      .all(authMiddleware.verifyIsDev)

      .post(authController.createSession)
      .get([verifySession(), authController.getUserIdFromSession]);

    this.app
      .route(`/api/auth/session/revoke`)
      .all(authMiddleware.verifyIsDev)
      .post([verifySession(), authController.revokeSessionsByUser]);

    /**
     * Google calls this route after successful oauth
     */
    this.app
      .route(`/api/oauth/google`)
      .post([
        authMiddleware.verifyGoogleOauthCode,
        authController.loginOrSignup,
      ]);

    return this.app;
  }
}
