import { Response, Request, NextFunction } from "express";
import { Status } from "@core/errors/status.codes";
import { SReqBody } from "@core/types/express.types";
import {
  AuthError,
  error,
  GcalError,
} from "@backend/common/errors/types/backend.errors";
import { IS_DEV } from "@backend/common/constants/env.constants";
import { hasGoogleHeaders } from "@backend/sync/services/sync.utils";
import { GCAL_NOTIFICATION_TOKEN } from "@backend/common/constants/backend.constants";

class AuthMiddleware {
  verifyIsDev = (_req: Request, res: Response, next: NextFunction) => {
    if (!IS_DEV) {
      res
        .status(Status.FORBIDDEN)
        .json({ error: error(AuthError.DevOnly, "Request Failed") });
    }
    next();
  };

  verifyIsFromGoogle = (req: Request, res: Response, next: NextFunction) => {
    const tokenIsInvalid =
      (req.headers["x-goog-channel-token"] as string) !==
      GCAL_NOTIFICATION_TOKEN;
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
