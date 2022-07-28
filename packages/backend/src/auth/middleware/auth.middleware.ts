import { Response, Request, NextFunction } from "express";
import { Status } from "@core/errors/status.codes";
import { SReqBody } from "@core/types/express.types";
import {
  AuthError,
  error,
  GcalError,
} from "@backend/common/errors/types/backend.errors";
import { IS_DEV } from "@backend/common/constants/env.constants";

class AuthMiddleware {
  verifyIsDev = (req: Request, res: Response, next: NextFunction) => {
    if (!IS_DEV) {
      res
        .status(Status.FORBIDDEN)
        .json({ error: error(AuthError.DevOnly, "Request Failed") });
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
