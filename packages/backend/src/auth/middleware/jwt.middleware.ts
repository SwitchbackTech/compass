// @ts-nocheck
import express from "express";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import crypto from "crypto";
import { Jwt } from "@core/types/jwt.types";
import { BaseError } from "@core/errors/errors.base";

const jwtSecret: string = process.env.JWT_SECRET;

type JwtToken = { _id: string; exp: number; iat: number };
class JwtMiddleware {
  verifyTokenAndSaveUserId = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const accessToken: string = req.headers.authorization
      ? req.headers.authorization.split("Bearer ").join("").trim()
      : null;

    //if there is no token stored in cookies, the request is unauthorized
    // TODO use BaseError
    if (!accessToken) {
      return res.status(403).json({ error: "Authentication required!" });
    }

    try {
      //throws error if token has expired or has a invalid signature
      const payload: JwtToken = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET
      );

      // Capture the user id for future use //
      res.locals = Object.assign({}, res.locals, { user: { id: payload._id } });

      next();
    } catch (e) {
      next(
        new BaseError(
          "Bad Access Token",
          `${e.message}. Clear local storage and retry`,
          401,
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
      .update(res.locals.jwt.userId + jwtSecret)
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
          res.locals.jwt = jwt.verify(authorization[1], jwtSecret) as Jwt;
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
