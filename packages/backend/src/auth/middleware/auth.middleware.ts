import { Response, Request, NextFunction } from "express";
import { Status } from "@core/errors/status.codes";
import { SReqBody } from "@backend/common/types/express.types";
import {
  AuthError,
  GcalError,
} from "@backend/common/constants/error.constants";
import { ENV, IS_DEV } from "@backend/common/constants/env.constants";
import { hasGoogleHeaders } from "@backend/sync/util/sync.utils";
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
          "Compass Verification Failed"
        ),
      });
      return;
    }

    next();
  };

  verifyIsFromGoogle = (req: Request, res: Response, next: NextFunction) => {
    const tokenIsInvalid =
      (req.headers["x-goog-channel-token"] as string) !==
      ENV.TOKEN_GCAL_NOTIFICATION;
    const isMissingHeaders = !hasGoogleHeaders(req.headers);

    if (isMissingHeaders || tokenIsInvalid) {
      res
        .status(Status.FORBIDDEN)
        .send({ error: error(GcalError.Unauthorized, "Notification Failed") });
      return;
    }

    next();
  };

  verifyGoogleOauthCode = (
    req: SReqBody<{ code: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      res
        .status(Status.FORBIDDEN)
        .json({ error: error(GcalError.CodeMissing, "gAPI Auth Failed") });
    }
    next();
  };
}

export default new AuthMiddleware();
