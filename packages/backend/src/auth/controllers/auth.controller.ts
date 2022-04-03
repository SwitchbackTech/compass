// @ts-nocheck
import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
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

import googleOauthService from "../services/google.auth.service";
import CompassAuthService from "../services/compass.auth.service";
import { loginCompleteHtml } from "../services/login.complete";

const logger = Logger("app:auth.controller");

class AuthController {
  checkOauthStatus = async (req: express.Request, res: express.Response) => {
    const integration: string = req.query["integration"];
    if (integration === Origin.Google) {
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

  getOauthUrl = (
    req: express.Request,
    res: express.Response
  ): Promise<Result_OauthUrl> => {
    if (req.query["integration"] === Origin.Google) {
      const authState = uuidv4();
      const authUrl = new googleOauthService().generateAuthUrl(authState);
      res.promise(Promise.resolve({ authUrl, authState }));
    }
  };

  loginWithPassword(req: express.Request, res: express.Response) {
    res.promise(
      new BaseError(
        "Not Implemented",
        "do this once adding user+pw support",
        500,
        true
      )
    );
  }

  loginAfterOauthSucceeded = async (
    req: express.Request,
    res: express.Response
  ) => {
    const _integration = Origin.Google;
    if (_integration === Origin.Google) {
      const query: Params_AfterOAuth = req.query;

      const gAuthService = new googleOauthService();
      await gAuthService.setTokens(query.code, null);
      const gUser: GoogleUser = await gAuthService.getUser();

      // TODO use query.state to start watching for that channel
      // via gcal.service

      const compassLoginData: CombinedLogin_Google = {
        user: gUser,
        oauth: Object.assign(
          {},
          { state: query.state },
          { tokens: gAuthService.getTokens() }
        ),
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
