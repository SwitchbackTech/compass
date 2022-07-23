import { google } from "googleapis";
import { getGcal } from "@backend/auth/services/google.auth.service";

const port = 2999;
const testCredentials = {
  clientId:
    "***REMOVED***",
  projectId: "***REMOVED***",
  authUri: "https://accounts.google.com/o/oauth2/auth",
  tokenUri: " https://oauth2.googleapis.com/token",
  clientSecret: "***REMOVED***-nfh0MfCEzPLrMS3_F3068gmYDp9v",
  redirectUri: `http://localhost:${port}/api/auth/oauth-complete`,
};

describe("Google Auth Service", () => {
  it("auths existing compass user", async () => {
    const gcalClient = await getGcal("62dc6053943c292c57abbcb9");
    const f = 1;
  });
  it("refreshes access token", async () => {
    const gOauthClient = new google.auth.OAuth2(
      testCredentials.clientId,
      testCredentials.clientSecret,
      testCredentials.redirectUri
    );

    gOauthClient.on("tokens", (tokens) => {
      if (tokens.refresh_token) {
        // store the refresh_token in your secure persistent database
        console.log("refreshToken:", tokens.refresh_token);
      }
      console.log("accessToken:", tokens.access_token);
    });

    gOauthClient.setCredentials({ refresh_token: "123" });

    const accessToken = await gOauthClient.getAccessToken();
    const token = await gOauthClient.getToken("foo");
    const tokenInfo = await gOauthClient.getTokenInfo("foo");
    const listenersCt = await gOauthClient.listenerCount("on");
    const i = "";
  });
});
