import { google } from "googleapis";
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
import { createToken } from "@backend/common/helpers/jwt.utils";

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

  // replace with service one, so don't have to keep re-doing
  // client stuff
  // does this set the 'offline' version (required for auto-refreshing)
  const oauthClient = new OAuth2Client(
    ENV.CLIENT_ID,
    ENV.CLIENT_SECRET,
    "postmessage"
  );

  oauthClient.on("tokens", (tokens) => {
    // ensures we use, persist the more recent refresh_token
    if (tokens.refresh_token) {
      console.log("** got REFRESH TOKEN! TODO: save in DB");
    }
    console.log("** got access token");
  });

  // make sure the token never expires by passing the persisted refresh token
  // so the oauthClient can swap them out if needed
  oauthClient.setCredentials({
    refresh_token: oauth.tokens.refresh_token,
  });

  const calendar = google.calendar({
    version: "v3",
    auth: oauthClient,
  });

  return calendar;

  /* old way */
  // const googleClient = new GoogleOauthService();
  // //@ts-ignore
  // await googleClient.oldSetTokens(null, oauth.tokens);

  // const calendar = google.calendar({
  //   version: "v3",
  //   auth: googleClient.oauthClient,
  // });
};

class GoogleOauthServiceOLD {
  accessToken: string | undefined;
  oauthClient: OAuth2Client;
  tokens: Credentials;

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

    const foundOauthUser = oauth && oauth.user ? true : false;
    if (!foundOauthUser) {
      return { isOauthComplete: false };
    }

    //!!-- need to save refresh token, cuz only here once
    // const accessToken = createToken(oauth.user); //--
    const accessToken = await this.initTokens(code);

    return { isOauthComplete: true, token: oauth.tokens.access_token };
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

  async initTokens(code: string) {
    const { tokens } = await this.oauthClient.getToken(code); //++
    // const { tokens } = await this.oauthClient.getToken(code); //++
    this.tokens = tokens;
    this.oauthClient.setCredentials(this.tokens);
    logger.debug("Set credentials as:", this.tokens);

    const accessToken = this.oauthClient.getAccessToken();
    return accessToken;
  }

  async initTokens(code: string) {
    const { tokens } = await this.oauthClient.getToken(code);

    this.tokens = tokens;
    this.oauthClient.setCredentials(this.tokens);

    console.log("inited tokens");
    return this.tokens;
  }

  //--++
  async oldSetTokens(code: string, tokens: Credentials | null) {
    if (tokens === null) {
      const { tokens } = await this.oauthClient.getToken(code);
      this.tokens = tokens;
    } else {
      this.tokens = tokens;
    }

    this.oauthClient.setCredentials(this.tokens);
    logger.debug("Set credentials");
  }
}

export default GoogleOauthServiceOLD;
