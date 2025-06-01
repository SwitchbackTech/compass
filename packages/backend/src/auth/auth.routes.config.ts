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
    /**
     * Checks whether user's google access token is still valid
     */
    this.app.route(`/api/auth/google`).get([
      verifySession(),
      //@ts-expect-error res.promise is not returning response types correctly
      authController.verifyGToken,
    ]);

    this.app
      .route(`/api/auth/session`)
      .all(authMiddleware.verifyIsDev)
      //@ts-expect-error res.promise is not returning response types correctly

      .post(authController.createSession)
      .get([
        verifySession(),
        //@ts-expect-error res.promise is not returning response types correctly
        authController.getUserIdFromSession,
      ]);

    this.app
      .route(`/api/auth/session/revoke`)
      .all(authMiddleware.verifyIsDev)
      .post([verifySession(), authController.revokeSessionsByUser]);

    /**
     * Google calls this route after successful oauth
     */
    this.app.route(`/api/oauth/google`).post([
      authMiddleware.verifyGoogleOauthCode,
      //@ts-expect-error res.promise is not returning response types correctly
      authController.loginOrSignup,
    ]);

    return this.app;
  }
}
