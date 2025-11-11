import express from "express";
import fronteggController from "@backend/auth/controllers/frontegg.controller";
import authMiddleware from "@backend/auth/middleware/auth.middleware";
import { verifyFronteggSession } from "@backend/auth/middleware/frontegg.auth.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";

/**
 * Frontegg POC routes
 * These routes demonstrate Frontegg authentication capabilities
 * parallel to the existing SuperTokens implementation
 */
export class FronteggAuthRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "FronteggAuthRoutes");
  }

  configureRoutes(): express.Application {
    /**
     * Test endpoint to verify Frontegg session
     * Requires a valid Frontegg JWT token in Authorization header
     */
    this.app
      .route(`/api/frontegg/auth/verify`)
      .get([verifyFronteggSession, fronteggController.verifySession]);

    /**
     * Get user information from Frontegg token
     */
    this.app
      .route(`/api/frontegg/auth/me`)
      .get([verifyFronteggSession, fronteggController.getUserInfo]);

    /**
     * Revoke all sessions for a user (dev only)
     */
    this.app
      .route(`/api/frontegg/auth/session/revoke`)
      .all(authMiddleware.verifyIsDev)
      .post([verifyFronteggSession, fronteggController.revokeUserSessions]);

    /**
     * Health check for Frontegg configuration
     */
    this.app.route(`/api/frontegg/health`).get(fronteggController.healthCheck);

    return this.app;
  }
}
