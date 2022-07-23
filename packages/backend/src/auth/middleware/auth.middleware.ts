import { Response, NextFunction } from "express";
import { Status } from "@core/errors/status.codes";
import { ReqBody } from "@core/types/express.types";

class AuthMiddleware {
  verifyGoogleOauthCode = (
    req: ReqBody<{ code: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      res.status(Status.FORBIDDEN).json({ error: "Missing Oauth Credentails" });
    }
    next();
  };
}

export default new AuthMiddleware();
