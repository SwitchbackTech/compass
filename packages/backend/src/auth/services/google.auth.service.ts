import { google } from "googleapis";
import jwt from "jsonwebtoken";
import express from "express";
import { Credentials, OAuth2Client } from "google-auth-library";
import { Result_OauthStatus, Schema_Oauth } from "@core/types/auth.types";
import { BaseError } from "@core/errors/errors.base";
import { gCalendar } from "@core/types/gcal";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { Collections } from "@backend/common/constants/collections";
import { isDev } from "@backend/common/helpers/common.helpers";
import { ENV } from "@backend/common/constants/env.constants";

const logger = Logger("app:google.auth.service");

/********
Helpers 
********/
export const getGcal = async (userId: string): Promise<gCalendar> => {
  //@ts-ignore
  const oauth: Schema_Oauth = await mongoService.db
    .collection(Collections.OAUTH)
    .findOne({ user: userId });

  if (oauth === null) {
    // throwing error forces middleware error handler to address
    // before other bad stuff can happen
    throw new BaseError(
      "Gcal Auth failed",
      `No OAUTH record for user: ${userId}`,
      500,
      true
    );
  }

  const googleClient = new GoogleOauthService();
  //@ts-ignore
  await googleClient.setTokens(null, oauth.tokens);

  const calendar = google.calendar({
    version: "v3",
    auth: googleClient.oauthClient,
  });

  return calendar;
};

class GoogleOauthService {
  //@ts-ignore
  tokens: {};
  oauthClient: OAuth2Client;

  constructor() {
    const redirectUri = isDev()
      ? `http://localhost:${ENV.PORT}/api/auth/oauth-complete`
      : `${ENV.BASEURL_PROD}/api/auth/oauth-complete`;

    this.oauthClient = new google.auth.OAuth2(
      ENV.CLIENT_ID,
      ENV.CLIENT_SECRET,
      redirectUri
    );
    this.tokens = {};
  }

  async checkOauthStatus(req: express.Request): Promise<Result_OauthStatus> {
    const state = req.query["state"];

    //@ts-ignore
    const oauth: Schema_Oauth = await mongoService.db
      .collection(Collections.OAUTH)
      .findOne({ state: state });

    const isComplete = oauth && oauth.user ? true : false;

    if (isComplete) {
      //TODO use other token creation method above
      // Create an access token //
      const accessToken = jwt.sign(
        { _id: oauth.user },
        ENV.ACCESS_TOKEN_SECRET,
        {
          algorithm: "HS256",
          expiresIn: ENV.ACCESS_TOKEN_LIFE,
        }
      );

      return { token: accessToken, isOauthComplete: isComplete };
    }
    return { isOauthComplete: isComplete };
  }

  generateAuthUrl(state: string) {
    const authUrl = this.oauthClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ENV.SCOPES,
      state: state,
    });
    return authUrl;
  }

  async getUser() {
    const oauth2 = google.oauth2({
      auth: this.oauthClient,
      version: "v2",
    });

    const response = await oauth2.userinfo.get();

    if (response.status === 200) {
      return response.data;
    } else {
      logger.error("Failed to get google oauth user");
      return new BaseError(
        "Failed to get Google OAuth user",
        response.toString(),
        500,
        true
      );
    }
  }

  getTokens() {
    return this.tokens;
  }

  async setTokens(code: string, tokens: Credentials | null) {
    if (tokens === null) {
      const { tokens } = await this.oauthClient.getToken(code);
      this.tokens = tokens;
    } else {
      this.tokens = tokens;
    }

    this.oauthClient.setCredentials(this.tokens);
    logger.debug("Credentials set");
  }
}

export default GoogleOauthService;
