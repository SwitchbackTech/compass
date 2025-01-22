import { google } from "googleapis";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { Logger } from "@core/logger/winston.logger";
import { Status } from "@core/errors/status.codes";
import { BaseError } from "@core/errors/errors.base";
import { gCalendar } from "@core/types/gcal";
import { UserInfo_Google } from "@core/types/auth.types";
import { ENV } from "@backend/common/constants/env.constants";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import {
  AuthError,
  UserError,
} from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { Schema_User } from "@core/types/user.types";
import { WithId } from "mongodb";

import compassAuthService from "./compass.auth.service";

const logger = Logger("app:google.auth.service");

export const getGAuthClientForUser = async (
  user: WithId<Schema_User> | { _id: string }
) => {
  const gAuthClient = new GoogleAuthService();

  let gRefreshToken: string | undefined;

  if ("google" in user && user.google) {
    gRefreshToken = user.google.gRefreshToken;
  }

  if (!gRefreshToken) {
    const userId = "_id" in user ? (user._id as string) : undefined;

    if (!userId) {
      logger.error(`Expected to either get a user or a userId.`);
      throw error(UserError.InvalidValue, "User not found");
    }

    const _user = await findCompassUserBy("_id", userId);

    if (!_user) {
      logger.error(`Couldn't find user with this id: ${userId}`);
      throw error(UserError.UserNotFound, "User not found");
    }

    gRefreshToken = _user.google.gRefreshToken;
  }

  gAuthClient.oauthClient.setCredentials({
    refresh_token: gRefreshToken,
  });

  return gAuthClient;
};

export const getGcalClient = async (userId: string): Promise<gCalendar> => {
  const user = await findCompassUserBy("_id", userId);
  if (!user) {
    logger.error(`Couldn't find user with this id: ${userId}`);
    await compassAuthService.revokeSessionsByUser(userId);
    throw error(
      UserError.UserNotFound,
      "Revoked session & gave up on gcal auth"
    );
  }

  const gAuthClient = await getGAuthClientForUser(user);

  const calendar = google.calendar({
    version: "v3",
    auth: gAuthClient.oauthClient,
  });

  return calendar;
};

class GoogleAuthService {
  oauthClient: OAuth2Client;

  constructor() {
    this.oauthClient = new OAuth2Client(
      ENV.CLIENT_ID,
      ENV.CLIENT_SECRET,
      "postmessage"
    );
  }

  getGcalClient(): gCalendar {
    const gcal = google.calendar({
      version: "v3",
      auth: this.oauthClient,
    });
    return gcal;
  }

  async getGoogleUserInfo(): Promise<UserInfo_Google> {
    const idToken = this.oauthClient.credentials.id_token;

    if (!idToken) {
      throw new BaseError(
        "No id_token",
        "oauth client is missing id_token, so couldn't verify user",
        Status.BAD_REQUEST,
        false
      );
    }

    const gUser = await this._decodeUserInfo(idToken);

    return { gUser, tokens: this.oauthClient.credentials };
  }

  async _decodeUserInfo(idToken: string) {
    const ticket = await this.oauthClient.verifyIdToken({
      idToken,
      audience: this.oauthClient._clientId,
    });
    const payload = ticket.getPayload() as TokenPayload;
    return payload;
  }

  async getAccessToken() {
    const { token } = await this.oauthClient.getAccessToken();

    if (!token) {
      throw error(
        AuthError.NoGAuthAccessToken,
        "No google auth access token found"
      );
    }

    return token;
  }
}

export default GoogleAuthService;
