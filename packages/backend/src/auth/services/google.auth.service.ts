import { google } from "googleapis";
import { Credentials, OAuth2Client, TokenPayload } from "google-auth-library";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { gCalendar } from "@core/types/gcal";
import { BaseError } from "@core/errors/errors.base";
import { UserInfo_Google } from "@core/types/auth.types";
import { ENV } from "@backend/common/constants/env.constants";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Schema_User } from "@core/types/user.types";

const logger = Logger("app:google.auth.service");

export const getGcalWithExistingRefreshToken = (
  tokens: Credentials
): gCalendar => {
  const oauthClient = new OAuth2Client(
    ENV.CLIENT_ID,
    ENV.CLIENT_SECRET,
    "postmessage"
  );

  oauthClient.setCredentials({
    refresh_token: tokens.refresh_token,
  });

  const calendar = google.calendar({
    version: "v3",
    auth: oauthClient,
  });

  return calendar;
};

export const getGcal = async (userId: string): Promise<gCalendar> => {
  const user = (await mongoService.db.collection(Collections.USER).findOne({
    _id: mongoService.objectId(userId),
  })) as Schema_User | null;

  if (!user) {
    // throwing error here forces middleware error handler to address
    // before other bad stuff can happen
    throw new BaseError(
      "Gcal Auth failed",
      `No OAUTH record for user: ${userId}`,
      500,
      true
    );
  }

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
    refresh_token: user.tokens.refresh_token,
  });

  const calendar = google.calendar({
    version: "v3",
    auth: oauthClient,
  });

  return calendar;
};

class GoogleAuthService {
  accessToken: string | undefined;
  oauthClient: OAuth2Client;
  // tokens: Credentials;

  constructor() {
    this.oauthClient = new OAuth2Client(
      ENV.CLIENT_ID,
      ENV.CLIENT_SECRET,
      "postmessage"
    );
    // .on("tokens", (tokens) => {
    //   if (tokens.refresh_token) {
    //     logger.debug("refresh token! TODO, save in DB");
    //   }
    //   logger.debug("got an access token, yo");
    // });
    // this.tokens = {};
  }

  getGcalClient() {
    const gcal = google.calendar({
      version: "v3",
      auth: this.oauthClient,
    });
    return gcal;
  }

  async getGoogleUserInfo(): Promise<UserInfo_Google | BaseError> {
    const idToken = this.oauthClient.credentials.id_token;

    if (!idToken) {
      return new BaseError(
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
}

export default GoogleAuthService;
