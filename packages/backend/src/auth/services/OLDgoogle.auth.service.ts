import { google } from "googleapis";
import express from "express";
import { Credentials, OAuth2Client } from "google-auth-library";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { Collections } from "@backend/common/constants/collections";
import { ENV } from "@backend/common/constants/env.constants";
import { IS_DEV } from "@backend/common/constants/backend.constants";

const logger = Logger("app:google.auth.serviceOLD");

/********
Helpers 
********/

class GoogleOauthServiceOLD {
  accessToken: string | undefined;
  oauthClient: OAuth2Client;
  tokens: Credentials;

  constructor() {
    const redirectUri = IS_DEV
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
