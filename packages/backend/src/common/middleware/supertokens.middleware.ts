import cors from "cors";
import { TokenPayload } from "google-auth-library";
import { default as SuperTokens } from "supertokens-node";
import Dashboard from "supertokens-node/recipe/dashboard";
import Session from "supertokens-node/recipe/session";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import UserMetadata from "supertokens-node/recipe/usermetadata";
import {
  APP_NAME,
  PORT_DEFAULT_BACKEND,
  PORT_DEFAULT_WEB,
} from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { zObjectId } from "@core/types/type.utils";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { ENV } from "@backend/common/constants/env.constants";
import syncService from "@backend/sync/services/sync.service";

export const initSupertokens = () => {
  SuperTokens.init({
    appInfo: {
      appName: APP_NAME,
      apiBasePath: "/api",
      apiDomain: `http://localhost:${PORT_DEFAULT_BACKEND}`,
      websiteBasePath: "/login",
      websiteDomain: `http://localhost:${PORT_DEFAULT_WEB}`,
    },
    supertokens: {
      connectionURI: ENV.SUPERTOKENS_URI,
      apiKey: ENV.SUPERTOKENS_KEY,
    },
    framework: "express",
    recipeList: [
      // see added endpoints
      // https://app.swaggerhub.com/apis/supertokens/FDI/3.0.0
      // https://supertokens.com/docs/references/fdi/introduction
      ThirdParty.init({
        signInAndUpFeature: {
          providers: [
            {
              config: {
                thirdPartyId: "google",
                clients: [
                  {
                    clientType: "web",
                    clientId: ENV.GOOGLE_CLIENT_ID,
                    clientSecret: ENV.GOOGLE_CLIENT_SECRET,
                    scope: [
                      "https://www.googleapis.com/auth/userinfo.email",
                      "https://www.googleapis.com/auth/calendar.readonly",
                      "https://www.googleapis.com/auth/calendar.events",
                    ],
                  },
                ],
              },
            },
          ],
        },
        override: {
          functions(originalImplementation) {
            return {
              ...originalImplementation,
              async signInUp(
                input: Parameters<typeof originalImplementation.signInUp>[0],
              ) {
                const response = await originalImplementation.signInUp(input);

                if (response.status === "OK") {
                  const providerUser = response.rawUserInfoFromProvider
                    .fromIdTokenPayload as TokenPayload;

                  const refreshToken = response.oAuthTokens["refresh_token"];

                  if (input.session === undefined || input.session === null) {
                    if (
                      response.createdNewRecipeUser &&
                      response.user.loginMethods.length === 1
                    ) {
                      // sign up logic
                      await compassAuthService.googleSignup(
                        providerUser,
                        refreshToken,
                        response.user.id,
                      );
                    } else {
                      // sign in logic
                      await compassAuthService.googleSignin(
                        providerUser,
                        response.oAuthTokens,
                      );
                    }
                  }
                }

                return response;
              },
            };
          },
        },
      }),
      Dashboard.init(),
      Session.init({
        override: {
          apis(originalImplementation) {
            return {
              ...originalImplementation,
              async signOutPOST(input) {
                if (!originalImplementation.signOutPOST) {
                  throw new BaseError(
                    "signOutPOST not implemented",
                    "signOutPOST not implemented",
                    Status.BAD_REQUEST,
                    true,
                  );
                }
                const userId = zObjectId.parse(input.session.getUserId());

                const userSessions = await Session.getAllSessionHandlesForUser(
                  userId.toString(),
                );

                const lastActiveSession = userSessions.length < 2;

                const res = await originalImplementation.signOutPOST(input);

                if (lastActiveSession) {
                  await syncService.stopWatches(userId.toString());
                }

                return res;
              },
            };
          },
        },
      }),
      UserMetadata.init(),
    ],
  });
};

export const supertokensCors = () =>
  cors({
    origin: `http://localhost:${PORT_DEFAULT_WEB}`,
    allowedHeaders: [
      "content-type",
      "st-auth-mode",
      ...SuperTokens.getAllCORSHeaders(),
    ],
    credentials: true,
  });
