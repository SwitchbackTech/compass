import { calendar } from "@googleapis/calendar";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import {
  type GoogleAuthCodeRequest,
  type UserInfo_Google,
} from "@core/types/auth.types";
import { type gCalendar } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import {
  assertGoogleRedirectUri,
  getGoogleAuthCallbackUrl,
} from "@backend/auth/services/google/util/google.redirect-uri.util";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isGoogleConfigured } from "@backend/common/constants/config.util";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";

class GoogleOAuthClient {
  oauthClient: OAuth2Client;

  constructor() {
    if (
      !CONFIG.GOOGLE_CLIENT_ID ||
      !CONFIG.GOOGLE_CLIENT_SECRET ||
      !isGoogleConfigured(CONFIG)
    ) {
      throw error(
        AuthError.GoogleNotConfigured,
        "Google OAuth client unavailable",
      );
    }

    this.oauthClient = new OAuth2Client(
      CONFIG.GOOGLE_CLIENT_ID,
      CONFIG.GOOGLE_CLIENT_SECRET,
      getGoogleAuthCallbackUrl(),
    );
  }

  getGcalClient(): gCalendar {
    return calendar({
      version: "v3",
      auth: this.oauthClient,
    });
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

    const gUser = await this.decodeUserInfo(idToken);

    return { gUser, tokens: this.oauthClient.credentials };
  }

  async exchangeAuthCode(
    input: GoogleAuthCodeRequest,
  ): Promise<UserInfo_Google> {
    assertGoogleRedirectUri(
      input.redirectURIInfo.redirectURIOnProviderDashboard,
    );

    const response = await this.oauthClient.getToken({
      code: input.redirectURIInfo.redirectURIQueryParams.code,
      codeVerifier: input.redirectURIInfo.pkceCodeVerifier,
    });

    this.oauthClient.setCredentials(response.tokens);

    return this.getGoogleUserInfo();
  }

  async decodeUserInfo(idToken: string) {
    const ticket = await this.oauthClient.verifyIdToken({
      idToken,
      audience: this.oauthClient._clientId,
    });
    return ticket.getPayload() as TokenPayload;
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

export default GoogleOAuthClient;
