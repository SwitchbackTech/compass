import { type NextFunction, type Request, type Response } from "express";
import { Status } from "@core/errors/status.codes";
import { isDev } from "@core/util/env.util";
import { CONFIG } from "@backend/common/constants/config.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";

class AuthMiddleware {
  verifyIsDev = (_req: Request, res: Response, next: NextFunction) => {
    // Read NODE_ENV from CONFIG each call so production never falls through
    // to next() after a 403 (and so tests can flip CONFIG.NODE_ENV).
    if (!isDev(CONFIG.NODE_ENV)) {
      res
        .status(Status.FORBIDDEN)
        .json({ error: error(AuthError.DevOnly, "Request Failed") });
      return;
    }
    next();
  };
}

export default new AuthMiddleware();
