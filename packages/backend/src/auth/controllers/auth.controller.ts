import { Response } from "express";
import { WithId } from "mongodb";
import { GaxiosError } from "gaxios";
import { TokenPayload } from "google-auth-library";
import { SessionRequest } from "supertokens-node/framework/express";
import Session from "supertokens-node/recipe/session";
import { Logger } from "@core/logger/winston.logger";
import { gCalendar } from "@core/types/gcal";
import { Schema_User } from "@core/types/user.types";
import { Result_Auth_Compass, UserInfo_Compass } from "@core/types/auth.types";
import {
  ReqBody,
  Res_Promise,
  SReqBody,
} from "@backend/common/types/express.types";
import { GcalError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import GoogleAuthService from "@backend/auth/services/google.auth.service";
import userService from "@backend/user/services/user.service";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import syncService from "@backend/sync/services/sync.service";

import { initGoogleClient } from "../services/auth.utils";

const logger = Logger("app:auth.controller");

const isCodeInvalid = (e: GaxiosError | Error) => {
  if ("code" in e && "message" in e) {
    return e.code === "400" && e.message === "invalid_grant";
  }
  return false;
};

class AuthController {
  createSession = async (req: ReqBody<UserInfo_Compass>, res: Response) => {
    const { cUserId, email } = req.body;

    if (cUserId) {
      await Session.createNewSession(res, cUserId, {}, {});
    }

    if (email) {
      const user = await findCompassUserBy("email", email);

      if (!user) {
        //@ts-ignore
        res.promise(Promise.resolve({ error: "user doesn't exist" }));
        return;
      }
      await Session.createNewSession(res, user._id.toString(), {}, {});
    }

    //@ts-ignore
    res.promise(
      Promise.resolve({
        message: `user session created for ${JSON.stringify(req.body)}`,
      })
    );
  };

  getUserIdFromSession = (req: SessionRequest, res: Response) => {
    const userId = req.session?.getUserId();

    //@ts-ignore
    res.promise(Promise.resolve({ userId }));
  };

  loginOrSignup = async (
    req: SReqBody<{ code: string }>,
    res: Res_Promise | Response
  ) => {
    try {
      const { code } = req.body;

      const gAuthClient = new GoogleAuthService();

      const { tokens } = await gAuthClient.oauthClient.getToken(code);

      const { gUser, gcalClient, gRefreshToken } = await initGoogleClient(
        gAuthClient,
        tokens
      );

      const user = await findCompassUserBy("google.googleId", gUser.sub);

      const { cUserId } = user
        ? await this.login(gcalClient, user)
        : await this.signup(gUser, gcalClient, gRefreshToken);

      await Session.createNewSession(res, cUserId);

      const result: Result_Auth_Compass = { cUserId };

      //@ts-ignore
      res.promise(Promise.resolve(result));
    } catch (e) {
      if (isCodeInvalid(e as GaxiosError)) {
        const invalidCodeErr = error(GcalError.CodeInvalid, "gAPI Auth Failed");
        logger.error(invalidCodeErr);

        //@ts-ignore
        res.promise(Promise.resolve({ error: invalidCodeErr }));
        return;
      }

      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  login = async (gcal: gCalendar, user: WithId<Schema_User>) => {
    const cUserId = user._id.toString();

    await syncService.importIncremental(cUserId, gcal);

    await userService.saveTimeFor("lastLoggedInAt", cUserId);

    return { cUserId };
  };

  revokeSessionsByUser = async (
    req: SReqBody<{ userId?: string }>,
    res: Response
  ) => {
    let userId;
    if (req.body.userId) {
      userId = req.body.userId;
    } else {
      userId = req.session?.getUserId() as string;
    }

    const revokeResult = await compassAuthService.revokeSessionsByUser(userId);

    res.send(revokeResult);
  };

  signup = async (
    gUser: TokenPayload,
    gcalClient: gCalendar,
    gRefreshToken: string
  ) => {
    const userId = await userService.initUserData(
      gUser,
      gcalClient,
      gRefreshToken
    );

    return { cUserId: userId };
  };
}

export default new AuthController();
