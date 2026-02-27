import { GaxiosError } from "gaxios";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { WithId } from "mongodb";
import { calendar } from "@googleapis/calendar";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { UserInfo_Google } from "@core/types/auth.types";
import { gCalendar } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import { Schema_User } from "@core/types/user.types";
import { ENV } from "@backend/common/constants/env.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const logger = Logger("app:google.auth.service");

export const getGAuthClientForUser = async (
  user: WithId<Schema_User> | { _id: string },
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
      throw error(UserError.InvalidValue, "User id is required");
    }

    const _user = await findCompassUserBy("_id", userId);

    if (!_user) {
      logger.error(`Couldn't find user with this id: ${userId}`);
      throw error(UserError.UserNotFound, "User not found");
    }

    if (!_user?.google?.gRefreshToken) {
      throw error(
        UserError.MissingGoogleRefreshToken,
        "User has not connected Google Calendar",
      );
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
    logger.error(`getGcalClient: Couldn't find user with this id: ${userId}`);

    // throw gaxios error here to trigger specific session invalidation
    // see error.express.handler.ts
    const gaxiosErr = new GaxiosError(
      "invalid_grant",
      {
        headers: new Headers(),
        url: new URL("https://www.googleapis.com/calendar/v3"),
      },
      {
        status: Status.BAD_REQUEST,
        data: { userId },
        config: {
          headers: new Headers(),
          url: new URL("https://www.googleapis.com/calendar/v3"),
        },
        statusText: "BAD_REQUEST Cannot initialize Gcal client",
        headers: new Headers(),
        ok: false,
        redirected: false,
        type: "error" as ResponseType,
        url: "https://www.googleapis.com/calendar/v3",
        body: null,
        bodyUsed: false,
        clone: () => {
          throw new Error("Not implemented");
        },
        arrayBuffer: async () => {
          throw new Error("Not implemented");
        },
        blob: async () => {
          throw new Error("Not implemented");
        },
        formData: async () => {
          throw new Error("Not implemented");
        },
        json: async () => ({ userId }),
        text: async () => JSON.stringify({ userId }),
        bytes: async () => {
          throw new Error("Not implemented");
        },
      },
    );
    gaxiosErr.code = "400";
    throw gaxiosErr;
  }

  if (!user.google?.gRefreshToken) {
    throw error(
      UserError.MissingGoogleRefreshToken,
      "User has not connected Google Calendar",
    );
  }

  const gAuthClient = await getGAuthClientForUser(user);

  const calendarClient = calendar({
    version: "v3",
    auth: gAuthClient.oauthClient,
  });

  return calendarClient;
};

class GoogleAuthService {
  oauthClient: OAuth2Client;

  constructor() {
    this.oauthClient = new OAuth2Client(
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
      "postmessage",
    );
  }

  getGcalClient(): gCalendar {
    const gcal = calendar({
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
        false,
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

  async refreshAccessToken() {
    const { token } = await this.oauthClient.getAccessToken();

    if (!StringV4Schema.safeParse(token).success) {
      throw error(
        AuthError.NoGAuthAccessToken,
        "Google auth access token not returned",
      );
    }

    return token;
  }
}

export default GoogleAuthService;
