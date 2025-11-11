import { Response } from "express";
import { GaxiosError } from "gaxios";
import { TokenPayload } from "google-auth-library";
import { ObjectId, WithId } from "mongodb";
import supertokens from "supertokens-node";
import { SessionRequest } from "supertokens-node/framework/express";
import Session from "supertokens-node/recipe/session";
import { Logger } from "@core/logger/winston.logger";
import { Result_Auth_Compass } from "@core/types/auth.types";
import { gCalendar } from "@core/types/gcal";
import { Schema_User } from "@core/types/user.types";
import { initGoogleClient } from "@backend/auth/services/auth.utils";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import GoogleAuthService from "@backend/auth/services/google.auth.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { isInvalidGoogleToken } from "@backend/common/services/gcal/gcal.utils";
import {
  ReqBody,
  Res_Promise,
  SReqBody,
} from "@backend/common/types/express.types";
import syncService from "@backend/sync/services/sync.service";
import { updateGoogleRefreshToken } from "@backend/user/queries/user.queries";
import userService from "@backend/user/services/user.service";

const logger = Logger("app:auth.controller");

class AuthController {
  createSession = async (
    req: ReqBody<{ cUserId: string }>,
    res: Res_Promise,
  ) => {
    const { cUserId } = req.body;

    if (!ObjectId.isValid(cUserId)) {
      res.promise({ error: "Invalid user ID" });
      return;
    }

    if (cUserId) {
      const sessionData =
        await compassAuthService.createSessionForUser(cUserId);

      res.promise({
        message: `User session created for ${cUserId}`,
        accessToken: sessionData.accessToken,
      });
    } else {
      res.promise({ error: "User doesn't exist" });
      return;
    }
  };

  getUserIdFromSession = (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId();

    res.promise({ userId });
  };

  loginOrSignup = async (req: SReqBody<{ code: string }>, res: Res_Promise) => {
    try {
      const { code } = req.body;

      const gAuthClient = new GoogleAuthService();

      const { tokens } = await gAuthClient.oauthClient.getToken(code);

      const { gUser, gcalClient, gRefreshToken } = await initGoogleClient(
        gAuthClient,
        tokens,
      );

      const { authMethod, user } = await compassAuthService.determineAuthMethod(
        gUser.sub,
      );
      const { cUserId, email } =
        authMethod === "login"
          ? await this.login(
              user as WithId<Schema_User>,
              gcalClient,
              gRefreshToken,
            )
          : await this.signup(gUser, gRefreshToken);

      const sUserId = supertokens.convertToRecipeUserId(cUserId);
      await Session.createNewSession(req, res, "public", sUserId, {
        email,
      });

      const result: Result_Auth_Compass = {
        cUserId,
        isNewUser: authMethod === "signup",
        email,
      };

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
    gRefreshToken: string,
  ) => {
    const cUserId = user._id.toString();

    if (gRefreshToken !== user.google.gRefreshToken) {
      await updateGoogleRefreshToken(cUserId, gRefreshToken);
    }

    try {
      await syncService.importIncremental(cUserId, gcal);
    } catch (e) {
      if (
        e instanceof Error &&
        e.message === SyncError.NoSyncToken.description
      ) {
        logger.info(
          `Resyncing google data due to missing sync for user: ${cUserId}`,
        );

        userService.restartGoogleCalendarSync(cUserId);
      }
    }

    await userService.saveTimeFor("lastLoggedInAt", cUserId);

    return { cUserId, email: user.email };
  };

  revokeSessionsByUser = async (
    req: SReqBody<{ userId?: string }>,
    res: Response,
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

  signup = async (gUser: TokenPayload, gRefreshToken: string) => {
    const user = await userService.initUserData(gUser, gRefreshToken);

    return { cUserId: user.userId, email: user.email };
  };
}

export default new AuthController();
