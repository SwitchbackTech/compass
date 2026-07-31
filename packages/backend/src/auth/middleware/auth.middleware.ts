import { type NextFunction, type Request, type Response } from "express";
import { Status } from "@core/errors/status.codes";
import { IS_DEV } from "@backend/common/constants/config.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";

class AuthMiddleware {
  verifyIsDev = (_req: Request, res: Response, next: NextFunction) => {
    if (!IS_DEV) {
      res
        .status(Status.FORBIDDEN)
        .json({ error: error(AuthError.DevOnly, "Request Failed") });
    }
    next();
  };
}

export default new AuthMiddleware();
