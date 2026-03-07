import type express from "express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import healthController from "./controllers/health.controller";

/**
 * Health Routes Configuration
 *
 * Provides health check endpoint for monitoring system status.
 * This endpoint does not require authentication as it's used by
 * load balancers, monitoring tools, and orchestration systems.
 */
export class HealthRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "HealthRoutes");
  }

  configureRoutes(): express.Application {
    /**
     * GET /api/health
     * Health check endpoint that verifies basic system connectivity
     *
     * @returns {Object} Health status with timestamp
     * @returns {200} OK - Database is reachable
     * @returns {500} Internal Server Error - Database is unreachable
     */
    this.app.route(`/api/health`).get(healthController.check);

    return this.app;
  }
}
