import { Response } from "express";
import { WithId } from "mongodb";
import { GaxiosError } from "gaxios";
import { TokenPayload } from "google-auth-library";
import { SessionRequest } from "supertokens-node/framework/express";
import supertokens from "supertokens-node";
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
import {
  findCompassUserBy,
  updateGoogleRefreshToken,
} from "@backend/user/queries/user.queries";
import GoogleAuthService, {
  getGAuthClientForUser,
} from "@backend/auth/services/google.auth.service";
import userService from "@backend/user/services/user.service";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import syncService from "@backend/sync/services/sync.service";
import { isInvalidGoogleToken } from "@backend/common/services/gcal/gcal.utils";
import { BaseError } from "@core/errors/errors.base";

import { initGoogleClient } from "../services/auth.utils";

const logger = Logger("app:auth.controller");

class AuthController {
  createSession = async (req: ReqBody<UserInfo_Compass>, res: Res_Promise) => {
    const { cUserId, email } = req.body;

    if (cUserId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const sUserId = supertokens.convertToRecipeUserId(cUserId);
      await Session.createNewSession(req, res, "public", sUserId);
    }

    if (email) {
      const user = await findCompassUserBy("email", email);

      if (!user) {
        res.promise({ error: "user doesn't exist" });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const sUserId = supertokens.convertToRecipeUserId(user._id.toString());
      await Session.createNewSession(req, res, "public", sUserId);
    }

    res.promise({
      message: `user session created for ${JSON.stringify(req.body)}`,
    });
  };

  getUserIdFromSession = (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId();

    res.promise({ userId });
  };

  verifyGToken = async (req: SessionRequest, res: Res_Promise) => {
    try {
      const userId = req.session?.getUserId();

      if (!userId) {
        res.promise({ valid: false, error: "No session found" });
        return;
      }

      const gAuthClient = await getGAuthClientForUser({ _id: userId });

      // Upon receiving an access token, we know the session is valid
      const accessToken = await gAuthClient.getAccessToken();

      res.promise({ valid: true });
    } catch (error) {
      if (error instanceof BaseError && error.result === "No access token") {
        res.promise({ valid: false, error: "Invalid Google Token" });
      } else {
        res.promise({
          valid: null, // We don't know if the session is valid or not, so we return null
          error,
        });
      }
    }
  };

  loginOrSignup = async (req: SReqBody<{ code: string }>, res: Res_Promise) => {
    try {
      const { code } = req.body;

      const gAuthClient = new GoogleAuthService();

      const { tokens } = await gAuthClient.oauthClient.getToken(code);

      const { gUser, gcalClient, gRefreshToken } = await initGoogleClient(
        gAuthClient,
        tokens
      );

      const { authMethod, user } = await compassAuthService.determineAuthMethod(
        gUser.sub
      );
      const { cUserId } =
        authMethod === "login"
          ? await this.login(
              user as WithId<Schema_User>,
              gcalClient,
              gRefreshToken
            )
          : await this.signup(gUser, gcalClient, gRefreshToken);

      const sUserId = supertokens.convertToRecipeUserId(cUserId);
      await Session.createNewSession(req, res, "public", sUserId);

      const result: Result_Auth_Compass = { cUserId };

      res.promise(result);
    } catch (e) {
      if (isInvalidGoogleToken(e as GaxiosError)) {
        const invalidCodeErr = error(GcalError.CodeInvalid, "gAPI Auth Failed");
        logger.error(invalidCodeErr);

        res.promise({ error: invalidCodeErr });
        return;
      }

      res.promise(Promise.reject(e));
    }
  };

  login = async (
    user: WithId<Schema_User>,
    gcal: gCalendar,
    gRefreshToken: string
  ) => {
    const cUserId = user._id.toString();

    if (gRefreshToken !== user.google.gRefreshToken) {
      await updateGoogleRefreshToken(cUserId, gRefreshToken);
    }

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
