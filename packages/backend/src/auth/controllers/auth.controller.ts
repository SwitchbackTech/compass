import { InsertOneResult } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { GaxiosResponse } from "gaxios";
import { Credentials } from "google-auth-library";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import Session from "supertokens-node/recipe/session";
import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { gCalendar } from "@core/types/gcal";
import { ReqBody, Res_Promise } from "@core/types/express.types";
import { Schema_User } from "@core/types/user.types";
import GoogleAuthService from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import eventService from "@backend/event/services/event.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import priorityService from "@backend/priority/services/priority.service";
import userService from "@backend/user/services/user.service";
import syncService from "@backend/sync/services/sync.service";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

import { AuthError, _throw } from "../auth.errors";

const logger = Logger("app:auth.controller");

const isCodeInvalid = (e: unknown | GaxiosResponse) => {
  return e?.code === "400" && e?.message === "invalid_grant";
};

class AuthController {
  loginOrSignup = async (req: ReqBody<{ code: string }>, res: Res_Promise) => {
    const { code } = req.body;

    const gAuthClient = new GoogleAuthService();

    try {
      const { tokens } = await gAuthClient.oauthClient.getToken(code);

      const { userExists, user } = await findCompassUserBy(
        "googleId",
        tokens.id_token as string
      );

      const authResult = userExists
        ? await this.login(gAuthClient, user)
        : await this.signup(gAuthClient, tokens);

      // old token stuff
      // const { token: accessToken } =
      // await gAuthClient.oauthClient.getAccessToken();
      // const accessToken = "get from compass JWT";
      const { cUserId } = authResult;
      // - creates new session & saves in supertokens DB
      // - attaches access & refresh token to the response's cookie
      cUserId && (await Session.createNewSession(res, cUserId));

      // const result = { success: true, message: `User logged in: ${cUserId}` };
      res.json(authResult);
      // res.promise(Promise.resolve({ ...result, accessToken }));
    } catch (e) {
      if (isCodeInvalid(e)) {
        logger.error("Failed to get gAPI tokens from code, because:\n", e);
        res.promise(Promise.resolve({ error: "Bad Code. See server logs" }));
      }
      logger.error(e);
      res.promise(
        Promise.resolve({
          error: e,
        })
      );
    }
  };

  login = async (gAuthClient: GoogleAuthService, user: Schema_User) => {
    // ): Promise<Result_Auth | BaseError> => { //--
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

    return { cUserId, success: true };
  };

  signup = async (gAuthClient: GoogleAuthService, tokens: Credentials) => {
    const refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      _throw(AuthError.MISSING_REFRESH_TOKEN, "Failed to auth to user's gCal");
    }

    try {
      gAuthClient.oauthClient.setCredentials(tokens);

      const gUserInfo = await gAuthClient.getGoogleUserInfo();
      if (gUserInfo instanceof BaseError) {
        return gUserInfo;
      }

      const cUserId = await userService.createUser(
        gUserInfo.gUser,
        refreshToken
      );
      if (!cUserId) {
        //replace with throw
        return { error: "Failed to create Compass user" };
      }

      const gcalClient = gAuthClient.getGcalClient();
      // const createCalListResult = await this._createDefaultCalendarList(
      await this._createDefaultCalendarList(gcalClient, cUserId);
      // if (createCalListResult instanceof BaseError) {
      //   return createCalListResult;
      // }

      // const createPrioritiesResult =
      await priorityService.createDefaultPriorities(cUserId);
      // if (createPrioritiesResult instanceof BaseError) {
      //   return createPrioritiesResult;
      // }

      const importEventsResult = await eventService.import(cUserId, gcalClient);
      if (importEventsResult.errors.length > 0) {
        logger.error(importEventsResult.errors);
        return { error: importEventsResult.errors };
      }
      //-- move this into import event service (?)
      await syncService.updateSyncToken(
        cUserId,
        "events",
        importEventsResult.nextSyncToken
      );

      const watchResult = await syncService.startWatchingCalendar(
        gcalClient,
        cUserId,
        GCAL_PRIMARY
      );

      const { saveForDev } = watchResult;
      if (saveForDev && saveForDev === "failed") {
        return { error: "saving watch info failed" };
      }

      if (watchResult.syncUpdate.ok !== 1) {
        return { error: "sync update failed" };
      }

      return { cUserId };
    } catch (e) {
      logger.error("Failed to get login, because:\n", e);
      return { error: e };
    }
  };

  _createDefaultCalendarList = async (
    gcal: gCalendar,
    userId: string
  ): Promise<InsertOneResult<Document> | BaseError> => {
    //-- try throwing instead
    const gcalListRes = await gcalService.listCalendars(gcal);
    if (gcalListRes instanceof BaseError) {
      return gcalListRes;
    }

    if (!gcalListRes.nextSyncToken) {
      //-- try throwing instead
      return new BaseError(
        "No calendarlist Sync Token",
        "Dev needs to support pagination",
        Status.INTERNAL_SERVER,
        true
      );
    }

    const ccalList = MapCalendarList.toCompass(gcalListRes);
    const ccalCreateRes = await calendarService.create(userId, ccalList);

    await syncService.updateSyncToken(
      userId,
      "calendarlist",
      gcalListRes.nextSyncToken
    );
    // if it worked, saved sync.calendarlist.nextSyncToken
    // nextSyncToken: gcalList.nextSyncToken || "error", //-- !! move

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
