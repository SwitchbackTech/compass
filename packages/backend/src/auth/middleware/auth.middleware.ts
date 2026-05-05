import { type NextFunction, type Request, type Response } from "express";
import { Status } from "@core/errors/status.codes";
import { ENV, IS_DEV } from "@backend/common/constants/env.constants";
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

  verifyIsFromCompass = (req: Request, res: Response, next: NextFunction) => {
    const tokenIsInvalid =
      (req.headers["x-comp-token"] as string) !== ENV.TOKEN_COMPASS_SYNC;

    if (tokenIsInvalid) {
      res.status(Status.FORBIDDEN).send({
        error: error(
          AuthError.InadequatePermissions,
          "Compass Verification Failed",
        ),
      });
      return;
    }

    next();
  };
}

export default new AuthMiddleware();
