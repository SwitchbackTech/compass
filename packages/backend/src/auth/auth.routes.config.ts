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
    // Google calls this route after successful oauth
    this.app.post(`/api/oauth/google`, [
      authMiddleware.verifyGoogleOauthCode,
      authController.loginOrSignup,
    ]);

    return this.app;
  }
}
//--
// this.app.route(`/api/auth/demo`).post(authController.superTokensDemo);
// this.app.get(`/api/auth/oauth-url`, [authController.getOauthUrl]);
// this.app.get(`/api/auth/oauth-status`, [authController.checkOauthStatus]);
// this.app.get(`/api/auth/oauth-complete`, [
// authController.loginAfterOauthSucceeded,
// ]);
