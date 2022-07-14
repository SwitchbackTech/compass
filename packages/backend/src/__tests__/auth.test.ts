import { google } from "googleapis";
import open from "open";
import express from "express";
import * as http from "http";
import helmet from "helmet";
import { Credentials, OAuth2Client } from "google-auth-library";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { AuthRoutes } from "@backend/auth/auth.routes.config";
import corsWhitelist from "@backend/common/middleware/cors.middleware";

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

/*
describe("auth redirect", () => {
  it("idk, wip", () => {
    const testApp = express();
    testApp.use(corsWhitelist);
    testApp.use(helmet());
    testApp.use(express.json());

    const routes: Array<CommonRoutesConfig> = [];
    routes.push(new AuthRoutes(testApp));
    const testServer: http.Server = http.createServer(testApp);
    testServer.listen(port, () => {
      console.log(`Server running on port: ${port}`);
    });


    const authUrl = oauthClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["profile", "email", "https://www.googleapis.com/auth/calendar"],
      state: "anyrandomid",
    });

    open(authUrl, { wait: false }).then((cp) => cp.unref());
    const f = 1;
  });
});
*/
