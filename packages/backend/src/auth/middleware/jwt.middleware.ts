// @ts-nocheck
import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Jwt } from "@core/types/jwt.types";
import { Status } from "@core/errors/status.codes";
import { BaseError } from "@core/errors/errors.base";
import { validateToken } from "@backend/common/helpers/jwt.utils";
import { Logger } from "@core/logger/winston.logger";

const logger = Logger("app:jwt.middleware");
const demoJwtSecret: string = process.env.JWT_SECRET;

type JwtToken = { _id: string; exp: number; iat: number };
class JwtMiddleware {
  // $$ delete (?)
  checkIfRefreshNeeded = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const accessToken: string = req.headers.authorization
      ? req.headers.authorization.split("Bearer ").join("").trim()
      : null;

    try {
      const payload: JwtToken = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET
      );
      // save refreshneeded false to req
      next();
    } catch (e) {
      next();
    }
  };

  verifyTokenAndSaveUserId = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const accessToken: string = req.headers.authorization
      ? req.headers.authorization.split("Bearer ").join("").trim()
      : null;

    if (!accessToken || accessToken === "null") {
      return res
        .status(Status.FORBIDDEN)
        .json({ error: "Authentication required!" });
    }

    try {
      const { refreshNeeded, payload, error } = validateToken(accessToken);

      if (error) {
        logger.error(error);
        return res.status(Status.UNSURE).json(error);
      }

      if (refreshNeeded) {
        return res.status(Status.UNAUTHORIZED).send();
      }

      // The current token is valid
      // use the _id value to associate it and infer the userId
      // then save it for future
      res.locals = Object.assign({}, res.locals, { user: { id: payload._id } });

      next();
    } catch (e) {
      next(
        new BaseError(
          "Unexpected Token Error",
          `${JSON.stringify(e.message)}`,
          Status.INTERNAL_SERVER,
          true
        )
      );
    }
  };

  /***************************************** */
  /* Stuff from the demo - update or remove */
  /***************************************** */
  verifyRefreshBodyField(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    if (req.body && req.body.refreshToken) {
      return next();
    } else {
      return res
        .status(400)
        .send({ errors: ["Missing required field: refreshToken"] });
    }
  }

  async validRefreshNeeded(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const user: any = await usersService.getUserByEmailWithPassword(
      res.locals.jwt.email
    );
    const salt = crypto.createSecretKey(
      Buffer.from(res.locals.jwt.refreshKey.data)
    );
    const hash = crypto
      .createHmac("sha512", salt)
      .update(res.locals.jwt.userId + demoJwtSecret)
      .digest("base64");
    if (hash === req.body.refreshToken) {
      req.body = {
        userId: user._id,
        email: user.email,
        permissionFlags: user.permissionFlags,
      };
      return next();
    } else {
      return res.status(400).send({ errors: ["Invalid refresh token"] });
    }
  }

  validJWTNeeded(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    if (req.headers["authorization"]) {
      try {
        const authorization = req.headers["authorization"].split(" ");
        if (authorization[0] !== "Bearer") {
          return res.status(401).send();
        } else {
          res.locals.jwt = jwt.verify(authorization[1], demoJwtSecret) as Jwt;
          next();
        }
      } catch (err) {
        return res.status(403).send();
      }
    } else {
      return res.status(401).send();
    }
  }
}

export default new JwtMiddleware();
