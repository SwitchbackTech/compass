import { google } from "googleapis";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { Status } from "@core/errors/status.codes";
import { BaseError } from "@core/errors/errors.base";
import { UserInfo_Google } from "@core/types/auth.types";
import { ENV } from "@backend/common/constants/env.constants";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

export const getGcalClient = async (userId: string) => {
  const { user, userExists } = await findCompassUserBy("_id", userId);
  if (!userExists) {
    throw new BaseError(
      "Gcal Auth failed",
      `Compass user does not exist: ${userId}`,
      Status.BAD_REQUEST,
      true
    );
  }

  const gAuthClient = new GoogleAuthService();

  gAuthClient.oauthClient.setCredentials({
    refresh_token: user.google.refreshToken,
  });

  const calendar = google.calendar({
    version: "v3",
    auth: gAuthClient.oauthClient,
  });

  return calendar;
};

class GoogleAuthService {
  accessToken: string | undefined;
  oauthClient: OAuth2Client;

  constructor() {
    this.oauthClient = new OAuth2Client(
      ENV.CLIENT_ID,
      ENV.CLIENT_SECRET,
      "postmessage"
    );
  }

  getGcalClient() {
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
}

export default GoogleAuthService;
