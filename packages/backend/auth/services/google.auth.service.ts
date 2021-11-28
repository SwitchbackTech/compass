import { google } from "googleapis";
import jwt from "jsonwebtoken";
import express from "express";

import mongoService from "../../common/services/mongo.service";
import { Logger } from "../../common/logger/common.logger";
import { Collections } from "../../common/constants/collections";
import { isDev } from "../../common/helpers/common.helpers";
import { OAuthTokens$Gcal } from "../../../core/src/types/auth.types";
import { BaseError } from "../../common/errors/errors.base";

const logger = Logger("app:google.auth.service");
const SCOPES = process.env.SCOPES.split(",");

export const getGcal = async (userId: string) => {
  const oAuthUser = await mongoService.db
    .collection(Collections.OAUTH)
    .findOne({ user: userId });

  if (oAuthUser === null) {
    // throw to force middleware error handler to address
    // before other bad stuff can happen
    throw new BaseError(
      "Gcal Auth failed",
      `No OAUTH record for user: ${userId}`,
      500,
      true
    );
  }

  const googleClient = new GoogleOauthService();
  await googleClient.setTokens(null, oAuthUser.tokens);

  const calendar = google.calendar({
    version: "v3",
    auth: googleClient.oAuth2Client,
  });

  return calendar;
};

export const updateNextSyncToken = async (
  userId: string,
  nextSyncToken: string
) => {
  const err = new BaseError(
    "Update Failed",
    `Failed to update the nextSyncToken for oauth record of user: ${userId}`,
    500,
    true
  );

  try {
    const response = await mongoService.db
      .collection(Collections.OAUTH)
      .updateOne(
        { user: userId },
        {
          $set: {
            "tokens.nextSyncToken": nextSyncToken,
          },
        }
      );

    if (response.matchedCount !== 1) {
      throw err;
    }

    return response;
  } catch (e) {
    logger.error(e);
    throw err;
  }
};

class GoogleOauthService {
  tokens: {};
  oAuth2Client;

  constructor() {
    logger.debug("Creating new oauth service ");
    const redirectUri = isDev()
      ? process.env.REDIRECT_URI_DEV
      : process.env.REDIRECT_URI;

    this.oAuth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      redirectUri
    );
    this.tokens = {};
  }

  async checkOauthStatus(req: express.Request) {
    const state = req.query.state;

    const oauth = await mongoService.db
      .collection(Collections.OAUTH)
      .findOne({ state: state });

    const isComplete = oauth && oauth.user ? true : false;

    if (isComplete) {
      //TODO use other token creation method above
      // Create an access token //
      const accessToken = jwt.sign(
        { _id: oauth.user },
        process.env.ACCESS_TOKEN_SECRET,
        {
          algorithm: "HS256",
          expiresIn: process.env.ACCESS_TOKEN_LIFE,
        }
      );

      return { token: accessToken, isOauthComplete: isComplete };
    }
    return { isOauthComplete: isComplete };
  }

  generateAuthUrl(state: string) {
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state: state,
    });
    return authUrl;
  }

  async getUser() {
    const oauth2 = google.oauth2({
      auth: this.oAuth2Client,
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

  async setTokens(code: string, tokens: OAuthTokens$Gcal | null) {
    // TODO after implementing the notification sync feature
    // - refactor so not so buggy
    if (tokens === null) {
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.tokens = tokens;
    } else {
      this.tokens = tokens;
    }
    this.oAuth2Client.setCredentials(this.tokens);
    logger.debug("Credentials set");
  }
}

export default GoogleOauthService;
// export default new GoogleOauthService();
