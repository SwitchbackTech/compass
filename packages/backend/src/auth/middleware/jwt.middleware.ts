import express from "express";
import { Status } from "@core/errors/status.codes";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import {
  parseBearerToken,
  validateToken,
} from "@backend/common/helpers/jwt.utils";

const logger = Logger("app:jwt.middleware");

class JwtMiddleware {
  //@ts-ignore
  verifyTokenAndSaveUserId = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const { tokenIncluded, token } = parseBearerToken(
      req.headers.authorization
    );

    if (!tokenIncluded || token === undefined) {
      return res
        .status(Status.FORBIDDEN)
        .json({ error: "Authentication required!" });
    }

    try {
      const { refreshNeeded, payload, error } = validateToken(token);

      if (refreshNeeded) {
        //++
        return res.status(Status.UNAUTHORIZED).send();
      }

      if (error) {
        logger.error(error);
        return res.status(Status.UNSURE).json(error);
      }

      // The current token is valid, so:
      // - use the _id value to associate it and infer the userId
      // - save userId in locals for extraction in relevant
      //   controller/service endpoint
      res.locals = Object.assign({}, res.locals, {
        user: { id: payload?._id },
      });

      next();
    } catch (e) {
      next(
        new BaseError("Auth Error", `${JSON.stringify(e)}`, Status.UNSURE, true)
      );
    }
  };
}

export default new JwtMiddleware();
