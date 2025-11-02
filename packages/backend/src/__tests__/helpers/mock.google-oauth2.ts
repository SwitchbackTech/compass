import { OAuth2Client } from "google-auth-library";
import { GetTokenResponse } from "google-auth-library/build/src/auth/oauth2client";

export class MockOAuth2Client extends OAuth2Client {
  async refreshTokenNoCache(refreshToken: string): Promise<GetTokenResponse> {
    return Promise.resolve({
      res: {
        data: {
          access_token: refreshToken,
          refresh_token: refreshToken,
          id_token: refreshToken,
          expiry_date: new Date().getTime() + 3600 * 1000,
        },
      } as GetTokenResponse["res"],
      tokens: {
        access_token: refreshToken,
        refresh_token: refreshToken,
        id_token: refreshToken,
        expiry_date: new Date().getTime() + 3600 * 1000,
        token_type: "refresh_token",
      },
    });
  }
}
