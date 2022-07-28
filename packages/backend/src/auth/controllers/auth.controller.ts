import { Response } from "express";
import { GaxiosResponse } from "gaxios";
import { Credentials } from "google-auth-library";
import { SessionRequest } from "supertokens-node/framework/express";
import Session from "supertokens-node/recipe/session";
import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { Logger } from "@core/logger/winston.logger";
import { gCalendar } from "@core/types/gcal";
import { ReqBody, Res_Promise, SReqBody } from "@core/types/express.types";
import { Schema_User } from "@core/types/user.types";
import GoogleAuthService from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import eventService from "@backend/event/services/event.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import priorityService from "@backend/priority/services/priority.service";
import userService from "@backend/user/services/user.service";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import syncService from "@backend/sync/services/sync.service";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import {
  error,
  AuthError,
  GcalError,
} from "@backend/common/errors/types/backend.errors";
import { Result_Auth_Compass, UserInfo_Compass } from "@core/types/auth.types";

const logger = Logger("app:auth.controller");

const isCodeInvalid = (e: unknown | GaxiosResponse) => {
  return e?.code === "400" && e?.message === "invalid_grant";
};

class AuthController {
  createSession = async (req: ReqBody<UserInfo_Compass>, res: Response) => {
    const { cUserId, email } = req.body;

    if (cUserId) {
      await Session.createNewSession(res, cUserId, {}, {});
    }

    if (email) {
      const { userExists, user } = await findCompassUserBy("email", email);

      if (!userExists) {
        res.promise(Promise.resolve({ error: "user doesn't exist" }));
        return;
      }
      await Session.createNewSession(res, user._id.toString(), {}, {});
    }

    res.promise(
      Promise.resolve({
        message: `user session created for ${JSON.stringify(req.body)}`,
      })
    );
  };

  getUserIdFromSession = (req: SessionRequest, res: Response) => {
    const userId = req.session?.getUserId();
    // res.promise(Promise.resolve({ userId }));
    res.send({ userId });
  };

  loginOrSignup = async (
    req: SReqBody<{ code: string }>,
    res: Res_Promise | Response
  ) => {
    const { code } = req.body;

    const gAuthClient = new GoogleAuthService();

    try {
      const { tokens } = await gAuthClient.oauthClient.getToken(code);

      const { userExists, user } = await findCompassUserBy(
        "googleId",
        tokens.id_token as string
      );

      const { cUserId } = userExists
        ? await this.login(gAuthClient, user)
        : await this.signup(gAuthClient, tokens);

      await Session.createNewSession(res, cUserId);

      const result: Result_Auth_Compass = { cUserId };
      // res.json({ cUserId });
      res.promise(Promise.resolve(result));
    } catch (e) {
      if (isCodeInvalid(e)) {
        const gError = error(GcalError.CodeInvalid, "gAPI Auth Failed");
        res.promise(Promise.resolve({ error: gError }));
        return;
      }

      logger.error("Auth failed, because:\n", e);
      res.promise(
        Promise.resolve({
          error: e,
        })
      );
    }
  };

  login = async (gAuthClient: GoogleAuthService, user: Schema_User) => {
    // - check if existing calendar watch
    //    - if not, start watching
    //    - if so...
    //      - check/extend expiration (?)
    // - incremental sync
    const cUserId = user._id.toString();

    // uses refresh token to ensure google API access
    gAuthClient.oauthClient.setCredentials({
      refresh_token: user?.google.refreshToken,
    });

    // validation & incremental sync...

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
      userId = req.session?.getUserId();
    }

    const revokeResult = await compassAuthService.revokeSessionsByUser(userId);

    res.send(revokeResult);
  };

  signup = async (gAuthClient: GoogleAuthService, tokens: Credentials) => {
    const refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      throw error(
        AuthError.MissingRefreshToken,
        "Failed to auth to user's gCal"
      );
    }

    // try {
    gAuthClient.oauthClient.setCredentials(tokens);

    const { gUser } = await gAuthClient.getGoogleUserInfo();

    const gcalClient = gAuthClient.getGcalClient();

    const cUserId = await userService.createUser(gUser, refreshToken);
    await this._createDefaultCalendarList(gcalClient, cUserId);

    await priorityService.createDefaultPriorities(cUserId);

    const { nextSyncToken } = await eventService.import(cUserId, gcalClient);

    await syncService.updateSyncToken(cUserId, "events", nextSyncToken);

    await syncService.startWatchingCalendar(gcalClient, cUserId, GCAL_PRIMARY);

    return { cUserId };
  };

  _createDefaultCalendarList = async (gcal: gCalendar, userId: string) => {
    const gcalListRes = await gcalService.listCalendars(gcal);
    if (!gcalListRes.nextSyncToken) {
      throw error(
        AuthError.PaginationNotSupported,
        "Calendarlist sync token not saved"
      );
    }

    const ccalList = MapCalendarList.toCompass(gcalListRes);
    const ccalCreateRes = await calendarService.create(userId, ccalList);

    await syncService.updateSyncToken(
      userId,
      "calendarlist",
      gcalListRes.nextSyncToken
    );

    return ccalCreateRes;
  };
}

export default new AuthController();

/* old auth routes

  checkOauthStatus = async (req: express.Request, res: express.Response) => {
    const integration: string = req.query["integration"];
    if (integration === Origin.GOOGLE) {
      const status = await new googleOauthServiceOLD().checkOauthStatus(req);
      res.promise(Promise.resolve(status));
    } else {
      res.promise(
        new BaseError(
          "Not Supported",
          `${integration} is not supported`,
          Status.BAD_REQUEST,
          true
        )
      );
    }
  };

  getOauthUrl = (
    req: express.Request,
    res: express.Response
  ): Promise<Result_OauthUrl> => {
    if (req.query["integration"] === Origin.GOOGLE) {
      const authState = uuidv4();
      const authUrl = new googleOauthServiceOLD().generateAuthUrl(authState);
      res.promise(Promise.resolve({ authUrl, authState }));
    }
  };

  loginAfterOauthSucceeded = async (
    req: express.Request,
    res: express.Response
  ) => {
    const _integration = Origin.GOOGLE;
    if (_integration === Origin.GOOGLE) {
      const query: Params_AfterOAuth = req.query;
      const { code, state } = query;

      const gAuthService = new googleOauthServiceOLD();
      const tokens = await gAuthService.initTokens(code);

      const gUser: User_Google = await gAuthService.getUser();

      // TODO use query.state to start watching for that channel
      // via gcal.service

      const compassLoginData: CombinedLogin_GoogleOLD = {
        user: gUser,
        oauth: Object.assign({}, { state }, { tokens }),
      };

      const loginResp = await compassAuthService.loginToCompassOLD(
        compassLoginData
      );

      //TODO validate resp
      res.promise(Promise.resolve(loginCompleteHtml));
    }
  };
*/
