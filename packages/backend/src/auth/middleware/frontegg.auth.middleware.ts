import { NextFunction, Request, Response } from "express";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import fronteggAuthService from "@backend/auth/services/frontegg.auth.service";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";

const logger = Logger("app:frontegg.auth.middleware");

// Extend Express Request type to include Frontegg user
declare global {
  namespace Express {
    interface Request {
      fronteggUser?: {
        id: string;
        email: string;
        name?: string;
        tenantId: string;
        tenantIds: string[];
        roles: string[];
        permissions: string[];
      };
    }
  }
}

/**
 * Middleware to verify Frontegg JWT access token
 * This is a POC implementation - in production, you'd want more robust verification
 */
export const verifyFronteggSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check if Frontegg is configured
    if (!fronteggAuthService.isConfigured()) {
      logger.warn("Frontegg not configured, skipping auth middleware");
      res.status(Status.NOT_IMPLEMENTED).json({
        error: error(
          AuthError.InadequatePermissions,
          "Frontegg authentication is not configured",
        ),
      });
      return;
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(Status.UNAUTHORIZED).json({
        error: error(AuthError.MissingRefreshToken, "No access token provided"),
      });
      return;
    }

    const accessToken = authHeader.substring(7); // Remove "Bearer " prefix

    // Validate the token with Frontegg
    const user = await fronteggAuthService.validateAccessToken(accessToken);

    if (!user) {
      res.status(Status.UNAUTHORIZED).json({
        error: error(
          AuthError.MissingRefreshToken,
          "Invalid or expired access token",
        ),
      });
      return;
    }

    // Attach user info to request
    req.fronteggUser = user;
    logger.debug(`Frontegg user authenticated: ${user.email}`);

    next();
  } catch (err) {
    logger.error("Error in Frontegg auth middleware:", err);
    res.status(Status.INTERNAL_SERVER).json({
      error: error(AuthError.NoUserId, "Failed to authenticate with Frontegg"),
    });
  }
};
