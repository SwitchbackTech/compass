import mongoService from "@backend/common/services/mongo.service";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { type Request, type Response } from "express";

interface HealthResponse {
  status: "ok" | "error";
  timestamp: string;
}

const logger = Logger("app:health.controller");

class HealthController {
  /**
   * GET /api/health
   * Health check endpoint that verifies basic system connectivity
   *
   * @returns {Object} Health status with timestamp
   * @returns {200} OK - Database is reachable
   * @returns {500} Internal Server Error - Database is unreachable
   */
  check = async (
    _req: Request<never, HealthResponse, never, never>,
    res: Response<HealthResponse>,
  ) => {
    const timestamp = new Date().toISOString();

    try {
      await mongoService.db.admin().ping();

      res.status(Status.OK).json({
        status: "ok",
        timestamp,
      });
    } catch (error) {
      logger.error("Database connectivity check failed", error);
      res.status(Status.INTERNAL_SERVER).json({
        status: "error",
        timestamp,
      });
    }
  };
}

export default new HealthController();
