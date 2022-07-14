import express from "express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";

import authController from "./controllers/auth.controller";

export class AuthRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "AuthRoutes");
  }

  configureRoutes(): express.Application {
    //--
    // this.app.get(`/api/auth/oauth-url`, [authController.getOauthUrl]);
    // this.app.get(`/api/auth/oauth-status`, [authController.checkOauthStatus]);
    // Called by Google after successful oauth
    // this.app.get(`/api/auth/oauth-complete`, [
    // authController.loginAfterOauthSucceeded,
    // ]);
    this.app.post(`/api/oauth/google`, [authController.exchangeCodeForToken]);

    return this.app;
  }
}
