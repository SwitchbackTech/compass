import { ENV } from "@backend/common/constants/env.constants";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
// import { google } from "googleapis"; //--
import { Credentials, OAuth2Client, TokenPayload } from "google-auth-library";
import { BaseError } from "@core/errors/errors.base";
import { UserInfo_Google } from "@core/types/auth.types";

const logger = Logger("app:google.auth.service");

class GoogleAuthService {
  accessToken: string | undefined;
  oauthClient: OAuth2Client;
  tokens: Credentials;

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

    this.tokens = {};
  }

  async getGoogleUserInfo(code: string): Promise<UserInfo_Google | BaseError> {
    const { tokens } = await this.oauthClient.getToken(code);
    this.oauthClient.setCredentials(tokens);

    const idToken = tokens.id_token;

    if (!idToken) {
      return new BaseError(
        "No id_token",
        "no id_token present, so couldn't verify user",
        Status.BAD_REQUEST,
        false
      );
    }

    const gUser = await this._decodeUserInfo(idToken, this.oauthClient);

    return { gUser, tokens };
  }

  async _decodeUserInfo(idToken: string, oauthClient: OAuth2Client) {
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: ENV.CLIENT_ID,
    });
    const payload = ticket.getPayload() as TokenPayload;
    return payload;
  }
}

export default GoogleAuthService;
