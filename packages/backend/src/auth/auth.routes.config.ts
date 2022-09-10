import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";

import authController from "./controllers/auth.controller";
import authMiddleware from "./middleware/auth.middleware";

export class AuthRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "AuthRoutes");
  }

  configureRoutes(): express.Application {
    /**
     * Convenience routes for debugging (eg via Postman)
     *
     * Production code shouldn't call these
     * directly, which is why they're limited to devs only
     */
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
    this.app.post(`/api/oauth/google`, [
      authMiddleware.verifyGoogleOauthCode,
      authController.loginOrSignup,
    ]);

    return this.app;
  }
}
