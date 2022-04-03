import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export type Jwt = {
  refreshKey: string;
  userId: string;
  permissionFlags: string;
};

const demoJwtSecret = "foo";

class JwtMiddlewareExamples {
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
}

/* routes config
    this.app.post(`/demo-auth/pw`, [
      // body("email").isEmail(),
      // body("password").isString(),
      // BodyValidationMiddleware.verifyBodyFieldsErrors,
      // authMiddleware.verifyUserPassword,
      // authController.demoCreateJWT,
      // authController.loginWithPassword,
    ]);
    this.app.post(`/demo-auth/refresh-token`, [
      //TODO update
      jwtMiddleware.validJWTNeeded,
      jwtMiddleware.verifyRefreshBodyField,
      jwtMiddleware.validRefreshNeeded,
      authController.demoCreateJWT,
    ]);
*/
