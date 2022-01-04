import express from "express";
// import { body } from "express-validator";

import { CommonRoutesConfig } from "@backend/common/common.routes.config";

import authController from "./controllers/auth.controller";
import jwtMiddleware from "./middleware/jwt.middleware";
// import authMiddleware from "./middleware/auth.middleware";
// import BodyValidationMiddleware from "../common/middleware/body.validation.middleware";

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

    this.app.get(`/auth/oauth-url`, [authController.getOauthUrl]);
    this.app.get(`/auth/oauth-status`, [
      // TODO validate that required integration query is present first
      // or replace query with params (oauth/google)
      authController.checkOauthStatus,
    ]);
    // Called by Google after successful oauth
    this.app.get(`/auth/oauth-complete`, [
      authController.loginAfterOauthSucceeded,
    ]);
    this.app.post(`/auth/refresh-token`, [
      jwtMiddleware.verifyTokenAndSaveUserId,
      authController.createJwt,
    ]);
    return this.app;
  }
}
