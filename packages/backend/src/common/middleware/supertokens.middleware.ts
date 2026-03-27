import cors from "cors";
import SuperTokens from "supertokens-node";
import AccountLinking from "supertokens-node/recipe/accountlinking";
import Dashboard from "supertokens-node/recipe/dashboard";
import EmailPassword from "supertokens-node/recipe/emailpassword";
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
import { ENV } from "@backend/common/constants/env.constants";
import {
  createEmailPasswordUser,
  createGoogleUser,
  handleEmailPasswordSignIn,
  handleEmailPasswordSignUp,
  handleGoogleSignInUp,
  handleSessionSignOut,
  sendPasswordResetEmail,
} from "@backend/common/middleware/supertokens.middleware.handlers";

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
      AccountLinking.init({
        shouldDoAutomaticAccountLinking: (_newAccountInfo, _user, session) => {
          if (session) {
            return Promise.resolve({
              shouldAutomaticallyLink: true,
              shouldRequireVerification: false,
            });
          }

          return Promise.resolve({ shouldAutomaticallyLink: false });
        },
      }),
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
              async manuallyCreateOrUpdateUser(input) {
                return createGoogleUser(
                  input,
                  originalImplementation.manuallyCreateOrUpdateUser.bind(
                    originalImplementation,
                  ),
                );
              },
            };
          },
          apis(originalImplementation) {
            return {
              ...originalImplementation,
              async signInUpPOST(input) {
                const signInUpPOST = originalImplementation.signInUpPOST;

                if (!signInUpPOST) {
                  throw new BaseError(
                    "signInUpPOST not implemented",
                    "signInUpPOST not implemented",
                    Status.BAD_REQUEST,
                    true,
                  );
                }

                return handleGoogleSignInUp(
                  input,
                  signInUpPOST.bind(originalImplementation),
                );
              },
            };
          },
        },
      }),
      EmailPassword.init({
        signUpFeature: {
          formFields: [
            {
              id: "name",
              validate: async (value) => {
                if (typeof value !== "string" || !value.trim()) {
                  return "Name is required";
                }
                return undefined;
              },
            },
          ],
        },
        emailDelivery: {
          override: (originalImplementation) => ({
            ...originalImplementation,
            sendEmail: (input) =>
              sendPasswordResetEmail(input, (emailInput) =>
                originalImplementation.sendEmail(emailInput),
              ),
          }),
        },
        override: {
          functions(originalImplementation) {
            return {
              ...originalImplementation,
              async createNewRecipeUser(input) {
                return createEmailPasswordUser(input, (recipeInput) =>
                  originalImplementation.createNewRecipeUser(recipeInput),
                );
              },
            };
          },
          apis(originalImplementation) {
            return {
              ...originalImplementation,
              async signUpPOST(input) {
                const signUpPOST = originalImplementation.signUpPOST;

                if (!signUpPOST) {
                  throw new BaseError(
                    "signUpPOST not implemented",
                    "signUpPOST not implemented",
                    Status.BAD_REQUEST,
                    true,
                  );
                }

                return handleEmailPasswordSignUp(
                  input,
                  signUpPOST.bind(originalImplementation),
                );
              },
              async signInPOST(input) {
                const signInPOST = originalImplementation.signInPOST;

                if (!signInPOST) {
                  throw new BaseError(
                    "signInPOST not implemented",
                    "signInPOST not implemented",
                    Status.BAD_REQUEST,
                    true,
                  );
                }

                return handleEmailPasswordSignIn(
                  input,
                  signInPOST.bind(originalImplementation),
                );
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
                const signOutPOST = originalImplementation.signOutPOST;

                if (!signOutPOST) {
                  throw new BaseError(
                    "signOutPOST not implemented",
                    "signOutPOST not implemented",
                    Status.BAD_REQUEST,
                    true,
                  );
                }

                return handleSessionSignOut(
                  input,
                  signOutPOST.bind(originalImplementation),
                );
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
