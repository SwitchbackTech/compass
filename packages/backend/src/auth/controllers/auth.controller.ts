// @ts-nocheck
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Origin } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import {
  CombinedLogin_GoogleOLD,
  User_Google,
  Params_AfterOAuth,
  Result_Auth_Compass,
  Result_OauthUrl,
} from "@core/types/auth.types";
import { ReqBody, Res } from "@core/types/express.types";
import priorityService from "@backend/priority/services/priority.service";

import googleOauthServiceOLD from "../services/google.auth.service"; //--
import CompassAuthService from "../services/compass.auth.service";
import { loginCompleteHtml } from "../services/login.complete";
import GoogleAuthService from "../services/google.auth.util";

const logger = Logger("app:auth.controller");

class AuthController {
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

  loginOrSignup = async (
    req: ReqBody<{ code: string }>,
    res: Res
  ): Promise<Result_Auth_Compass> => {
    const { code } = req.body;

    const googleAuthService = new GoogleAuthService();
    const gUserInfo = await googleAuthService.getGoogleUserInfo(code);
    //save token info
    // save tokens (esp refresh_token) in `oauth` collection
    // oauthClient.setCredentials(tokens)
    // oauthClient.setCredentials()
    // const token = oauthClient.getAccessToken();

    const compassAuthService = new CompassAuthService();
    const { accessToken, authType, userId } = await compassAuthService.initUser(
      gUserInfo
    );

    if (authType === "login") {
      //-- sign user in
      // incremental sync
    } else {
      //setup account
      logger.debug("Setting up user account for new user");
      await priorityService.createDefaultPriorities(userId);
      // create calendarList
      // import events
      // setup channel watch
    }

    const authResult = { accessToken, authType };

    res.promise(Promise.resolve(authResult));
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

      const compassAuthService = new CompassAuthService();
      const loginResp = await compassAuthService.loginToCompassOLD(
        compassLoginData
      );

      //TODO validate resp
      res.promise(Promise.resolve(loginCompleteHtml));
    }
  };
}

export default new AuthController();
