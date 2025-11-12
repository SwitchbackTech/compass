import cors from "cors";
import { TokenPayload } from "google-auth-library";
import { default as SuperTokens } from "supertokens-node";
import Dashboard from "supertokens-node/recipe/dashboard";
import { default as Session } from "supertokens-node/recipe/session";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import UserMetadata from "supertokens-node/recipe/usermetadata";
import {
  APP_NAME,
  PORT_DEFAULT_BACKEND,
  PORT_DEFAULT_WEB,
} from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { getGAuthClientForUser } from "@backend/auth/services/google.auth.service";
import { ENV } from "@backend/common/constants/env.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";

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

                  if (input.session === undefined) {
                    if (
                      response.createdNewRecipeUser &&
                      response.user.loginMethods.length === 1
                    ) {
                      // sign up logic
                      await compassAuthService.signInWithSuperTokens(
                        providerUser,
                        refreshToken,
                        response.user.id,
                      );
                    } else {
                      // sign in logic
                      await compassAuthService.loginWithSuperTokens(
                        providerUser,
                        response.oAuthTokens,
                        response.user.id,
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
              async verifySession(input) {
                const session =
                  await originalImplementation.verifySession(input);

                const userId = zObjectId.safeParse(session?.getUserId(), {
                  error: () => "Invalid user ID in session",
                });

                if (!userId.success) {
                  throw new BaseError(
                    userId.error.message,
                    userId.error.message,
                    Status.UNAUTHORIZED,
                    true,
                  );
                }

                const gAuthClient = await getGAuthClientForUser({
                  _id: userId.data.toString(),
                });

                const gAccessToken = await gAuthClient.getAccessToken();

                const gToken = StringV4Schema.safeParse(gAccessToken, {
                  error: () => AuthError.NoGAuthAccessToken.description,
                });

                if (!gToken.success) {
                  throw new BaseError(
                    AuthError.NoGAuthAccessToken.description,
                    gToken.error.message,
                    Status.UNAUTHORIZED,
                    true,
                  );
                }

                return session;
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
