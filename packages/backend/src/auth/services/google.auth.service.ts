//@ts-nocheck
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

const logger = Logger("app:google.auth.service");
//@ts-ignore
const SCOPES = process.env["SCOPES"].split(",");

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
    // always using PROD, even if in dev, so that you can still debug prod builds without needing
    // to use localhost
    //@ts-ignore
    const redirectUri = `${process.env.BASEURL_PROD}/api/auth/oauth-complete`;

    this.oauthClient = new google.auth.OAuth2(
      process.env["CLIENT_ID"],
      process.env["CLIENT_SECRET"],
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

    const pro = process.env;
    console.log(proc);
    const _oauth = oauth;
    console.log(oauth);

    const isComplete = oauth && oauth.user ? true : false;

    if (isComplete) {
      //TODO use other token creation method above
      // Create an access token //
      //@ts-ignore
      const accessToken = jwt.sign(
        { _id: oauth.user },
        process.env["ACCESS_TOKEN_SECRET"],
        {
          algorithm: "HS256",
          expiresIn: process.env["ACCESS_TOKEN_LIFE"],
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
      scope: SCOPES,
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
