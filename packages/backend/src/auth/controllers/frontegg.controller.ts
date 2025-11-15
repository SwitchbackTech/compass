import { Request, Response } from "express";
import { Logger } from "@core/logger/winston.logger";
import fronteggAuthService from "@backend/auth/services/frontegg.auth.service";
import { Res_Promise } from "@backend/common/types/express.types";

const logger = Logger("app:frontegg.controller");

class FronteggController {
  /**
   * Verify that a Frontegg session is valid
   * This endpoint is protected by verifyFronteggSession middleware
   */
  verifySession = (req: Request, res: Res_Promise) => {
    const user = req.fronteggUser;

    if (!user) {
      res.promise({
        error: "No user information available",
        isValid: false,
      });
      return;
    }

    res.promise({
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        roles: user.roles,
      },
      message: "Session is valid",
    });
  };

  /**
   * Get user information from the Frontegg token
   */
  getUserInfo = (req: Request, res: Res_Promise) => {
    const user = req.fronteggUser;

    if (!user) {
      res.promise({
        error: "No user information available",
      });
      return;
    }

    res.promise({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        tenantIds: user.tenantIds,
        roles: user.roles,
        permissions: user.permissions,
      },
    });
  };

  /**
   * Revoke all sessions for a user
   * Dev endpoint for testing session revocation
   */
  revokeUserSessions = async (req: Request, res: Response) => {
    try {
      const user = req.fronteggUser;

      if (!user) {
        res.status(400).send({ error: "No user information available" });
        return;
      }

      const result = await fronteggAuthService.revokeUserSessions(user.id);

      res.send({
        message: `Revoked sessions for user ${user.email}`,
        sessionsRevoked: result.revoked,
      });
    } catch (error) {
      logger.error("Failed to revoke user sessions:", error);
      res.status(500).send({
        error: "Failed to revoke user sessions",
      });
    }
  };

  /**
   * Health check endpoint to verify Frontegg is configured
   */
  healthCheck = (_req: Request, res: Response) => {
    const isConfigured = fronteggAuthService.isConfigured();

    res.send({
      service: "frontegg",
      status: isConfigured ? "configured" : "not configured",
      message: isConfigured
        ? "Frontegg is configured and ready"
        : "Frontegg environment variables not set",
    });
  };
}

export default new FronteggController();
