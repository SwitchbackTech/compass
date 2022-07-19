import { InsertOneResult } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { Credentials } from "google-auth-library";
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

import compassAuthService, {
  findCompassUser,
} from "../services/compass.auth.service";

const logger = Logger("app:auth.controller");

class AuthController {
  loginOrSignup = async (req: ReqBody<{ code: string }>, res: Res_Promise) => {
    const { code } = req.body;

    const gAuthClient = new GoogleAuthService();

    const { tokens } = await gAuthClient.oauthClient.getToken(code);

    const googleId = tokens.id_token as string;
    const { userExists, user } = await findCompassUser(googleId);

    const result = userExists
      ? await this.login(gAuthClient, user as Schema_User)
      : await this.signup(gAuthClient, tokens);

    const { token: accessToken } =
      await gAuthClient.oauthClient.getAccessToken();

    res.promise(Promise.resolve({ ...result, accessToken }));
  };

  login = async (gAuthClient: GoogleAuthService, user: Schema_User) => {
    // uses existing refresh token
    gAuthClient.oauthClient.setCredentials({
      refresh_token: user?.google.refreshToken,
    });

    return { success: true };
    // validation & incremental sync...
  };

  signup = async (gAuthClient: GoogleAuthService, tokens: Credentials) => {
    const refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      return new BaseError(
        "Create User Failed",
        "Failed to create Compass user, because no gcal refresh token provided",
        Status.BAD_REQUEST,
        true
      );
    }

    gAuthClient.oauthClient.setCredentials(tokens);

    const gUserInfo = await gAuthClient.getGoogleUserInfo();
    if (gUserInfo instanceof BaseError) {
      return gUserInfo;
    }

    const cUserId = await userService.createUser(gUserInfo.gUser, refreshToken);
    if (!cUserId) {
      return { error: "Failed to create Compass user" };
    }

    const gcalClient = gAuthClient.getGcalClient();
    const createCalListResult = await this._createDefaultCalendarList(
      gcalClient,
      cUserId
    );
    if (createCalListResult instanceof BaseError) {
      return createCalListResult;
    }

    const createPrioritiesResult =
      await priorityService.createDefaultPriorities(cUserId);
    if (createPrioritiesResult instanceof BaseError) {
      return createCalListResult;
    }

    /* import events
    x import events
    x update nextSyncToken
    - start channel watch
    - ...update sync data (?)
    */
    const importEventsResult = await eventService.import(cUserId, gcalClient);
    if (importEventsResult.errors.length > 0) {
      logger.error(importEventsResult.errors);
      return { succes: false, errors: importEventsResult.errors };
    }
    const syncTokenUpdateResult = await syncService.updateNextSyncToken(
      cUserId,
      importEventsResult.nextSyncToken
    );
    if (syncTokenUpdateResult instanceof BaseError) {
      return syncTokenUpdateResult;
    }

    const watchResult = await syncService.startWatchingCalendar(
      gcalClient,
      cUserId,
      GCAL_PRIMARY
    );
    if (watchResult.syncUpdate.ok !== 1) {
      return { success: false, error: "sync update failed" };
    }

    // save signup datetime in user collection

    return { success: true };
  };

  _createDefaultCalendarList = async (
    gcal: gCalendar,
    userId: string
  ): Promise<InsertOneResult<Document> | BaseError> => {
    const gcalListRes = await gcalService.listCalendars(gcal);
    if (gcalListRes instanceof BaseError) {
      return gcalListRes;
    }

    const ccalList = MapCalendarList.toCompass(gcalListRes);
    const ccalCreateRes = await calendarService.create(userId, ccalList);

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
