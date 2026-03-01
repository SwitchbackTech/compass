import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import userController from "./controllers/user.controller";

/**
 * User Routes Configuration
 *
 * Handles user profile and metadata management endpoints.
 * All routes require authentication via Supertokens session.
 */
export class UserRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "UserRoutes");
  }

  configureRoutes(): express.Application {
    /**
     * GET /api/user/profile
     * Retrieves the current user's profile information
     *
     * @auth Required - Supertokens session
     * @returns {Object} User profile data including email, name, and settings
     * @throws {401} Unauthorized - Invalid or missing session
     * @throws {404} Not Found - User not found
     */
    this.app
      .route(`/api/user/profile`)
      .all(verifySession())
      .get(userController.getProfile);

    /**
     * GET /api/user/metadata
     * Retrieves user metadata (preferences, settings, etc.)
     *
     * POST /api/user/metadata
     * Updates user metadata
     *
     * @auth Required - Supertokens session
     * @body {Object} metadata - User metadata to update
     * @returns {Object} Updated metadata
     * @throws {401} Unauthorized - Invalid or missing session
     * @throws {400} Bad Request - Invalid metadata format
     */
    this.app
      .route(`/api/user/metadata`)
      .all(verifySession())
      .get(userController.getMetadata)
      .post(userController.updateMetadata);

    return this.app;
  }
}
