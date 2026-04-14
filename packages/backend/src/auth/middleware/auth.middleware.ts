import { ENV, IS_DEV } from "@backend/common/constants/env.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { hasGoogleHeaders } from "@backend/sync/util/sync.util";
import { decodeChannelToken } from "@backend/sync/util/watch.util";
import { COMPASS_RESOURCE_HEADER } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import { type NextFunction, type Request, type Response } from "express";

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

  verifyIsFromGoogle = (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers["x-goog-channel-token"] as string;
      const isMissingHeaders = !hasGoogleHeaders(req.headers);
      const decoded = decodeChannelToken(token);

      if (isMissingHeaders || !decoded) {
        res.status(Status.FORBIDDEN).send({
          error: error(GcalError.Unauthorized, "Notification Failed"),
        });
        return;
      }

      res.set(COMPASS_RESOURCE_HEADER, decoded.resource);

      next();
    } catch (e) {
      next(e);
    }
  };
}

export default new AuthMiddleware();
