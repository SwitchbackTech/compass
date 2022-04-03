import express from "express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";

import authController from "./controllers/auth.controller";
import jwtMiddleware from "./middleware/jwt.middleware";

export class AuthRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "AuthRoutes");
  }

  configureRoutes(): express.Application {
    /* 
    demo code from template. update or delete
    */

    this.app.post(`/demo-auth/pw`, [
      // body("email").isEmail(),
      // body("password").isString(),
      // BodyValidationMiddleware.verifyBodyFieldsErrors,
      // authMiddleware.verifyUserPassword,
      // authController.demoCreateJWT,
      authController.loginWithPassword,
    ]);
    this.app.post(`/demo-auth/refresh-token`, [
      //TODO update
      jwtMiddleware.validJWTNeeded,
      jwtMiddleware.verifyRefreshBodyField,
      jwtMiddleware.validRefreshNeeded,
      authController.demoCreateJWT,
    ]);

    this.app.get(`/api/auth/oauth-url`, [authController.getOauthUrl]);
    this.app.get(`/api/auth/oauth-status`, [authController.checkOauthStatus]);
    // Called by Google after successful oauth
    this.app.get(`/api/auth/oauth-complete`, [
      authController.loginAfterOauthSucceeded,
    ]);
    this.app.post(`/api/auth/refresh-token`, [authController.refreshJwt]);
    return this.app;
  }
}
