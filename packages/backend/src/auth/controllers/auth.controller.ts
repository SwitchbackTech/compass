// @ts-nocheck
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Origin } from "@core/core.constants";
import { Logger } from "@core/logger/winston.logger";
import {
  CombinedLogin_Google,
  GoogleUser,
  Params_AfterOAuth,
  Result_OauthUrl,
} from "@core/types/auth.types";
import { ReqBody, Res } from "@core/types/express.types";
import { isDev } from "@backend/common/helpers/common.helpers";
import { ENV } from "@backend/common/constants/env.constants";

import googleOauthService from "../services/google.auth.service";
import CompassAuthService from "../services/compass.auth.service";
import { loginCompleteHtml } from "../services/login.complete";

const logger = Logger("app:auth.controller");

class AuthController {
  checkOauthStatus = async (req: express.Request, res: express.Response) => {
    const integration: string = req.query["integration"];
    if (integration === Origin.GOOGLE) {
      const status = await new googleOauthService().checkOauthStatus(req);
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

  exchangeCodeForToken = async (
    req: ReqBody<{ code: string }>,
    res: Res
  ): Promise<Result_Token> => {
    const { code } = req.body;

    // const oauthClient = new google.auth.OAuth2(
    //   ENV.CLIENT_ID,
    //   ENV.CLIENT_SECRET,
    //   "postmessage"
    // );

    const oauthClient = new OAuth2Client(
      ENV.CLIENT_ID,
      ENV.CLIENT_SECRET,
      "postmessage"
    );

    const { tokens } = await oauthClient.getToken(code);
    console.log("TODO: persist refresh token");
    // oauthClient.setCredentials(tokens)
    // oauthClient.setCredentials()
    // const token = oauthClient.getAccessToken();
    // oauthClient.setC
    res.promise(Promise.resolve({ token: tokens.access_token }));
  };

  getOauthUrl = (
    req: express.Request,
    res: express.Response
  ): Promise<Result_OauthUrl> => {
    if (req.query["integration"] === Origin.GOOGLE) {
      const authState = uuidv4();
      const authUrl = new googleOauthService().generateAuthUrl(authState);
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

      const gAuthService = new googleOauthService();
      const tokens = await gAuthService.initTokens(code);

      const gUser: GoogleUser = await gAuthService.getUser();

      // TODO use query.state to start watching for that channel
      // via gcal.service

      const compassLoginData: CombinedLogin_Google = {
        user: gUser,
        oauth: Object.assign({}, { state }, { tokens }),
      };

      const compassAuthService = new CompassAuthService();
      const loginResp = await compassAuthService.loginToCompass(
        compassLoginData
      );

      //TODO validate resp
      res.promise(Promise.resolve(loginCompleteHtml));
    }
  };
}

export default new AuthController();
