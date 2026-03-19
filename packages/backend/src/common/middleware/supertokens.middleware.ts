import cors from "cors";
import { ObjectId } from "mongodb";
import supertokens, { default as SuperTokens, User } from "supertokens-node";
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
import { Logger } from "@core/logger/winston.logger";
import { zObjectId } from "@core/types/type.utils";
import googleAuthService from "@backend/auth/services/google/google.auth.service";
import { IS_DEV } from "@backend/common/constants/env.constants";
import { ENV } from "@backend/common/constants/env.constants";
import {
  type CreateGoogleSignInResponse,
  type ThirdPartySignInUpInput,
  buildResetPasswordLink,
  createGoogleSignInSuccess,
  ensureExternalUserIdMapping,
  getFormFieldValue,
} from "@backend/common/middleware/supertokens.middleware.util";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";

const logger = Logger("app:supertokens.middleware");

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
        shouldDoAutomaticAccountLinking: async (newAccountInfo) => {
          if (!newAccountInfo.email) {
            return { shouldAutomaticallyLink: false };
          }

          return {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: true,
          };
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
                const user = await mongoService.user.findOne(
                  { "google.googleId": input.thirdPartyUserId },
                  { projection: { _id: 1, signedUpAt: 1, email: 1 } },
                );

                const id = user?._id.toString() ?? new ObjectId().toString();
                const timeJoined = user?.signedUpAt?.getTime() ?? Date.now();
                const thirdParty = [
                  { id: input.thirdPartyId, userId: input.thirdPartyUserId },
                ];

                return {
                  status: "OK",
                  createdNewRecipeUser: user === null,
                  recipeUserId: supertokens.convertToRecipeUserId(id),
                  timeJoined,
                  thirdParty,
                  user: new User({
                    emails: [user?.email ?? input.email],
                    id,
                    isPrimaryUser: false,
                    thirdParty,
                    timeJoined,
                    loginMethods: [
                      {
                        recipeId: "thirdparty",
                        recipeUserId: id,
                        tenantIds: [input.tenantId],
                        timeJoined,
                        verified: input.isVerified,
                        email: input.email,
                        thirdParty: thirdParty[0],
                        webauthn: { credentialIds: [] },
                      },
                    ],
                    phoneNumbers: [],
                    tenantIds: [input.tenantId],
                    webauthn: { credentialIds: [] },
                  }),
                };
              },
            };
          },
          apis(originalImplementation) {
            return {
              ...originalImplementation,
              async signInUpPOST(input: ThirdPartySignInUpInput) {
                if (!originalImplementation.signInUpPOST) {
                  throw new BaseError(
                    "signInUpPOST not implemented",
                    "signInUpPOST not implemented",
                    Status.BAD_REQUEST,
                    true,
                  );
                }

                const response =
                  await originalImplementation.signInUpPOST(input);
                const success = createGoogleSignInSuccess(
                  response as CreateGoogleSignInResponse,
                );

                if (success) {
                  await googleAuthService.handleGoogleAuth(success);
                }

                return response;
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
          service: {
            sendEmail: async (input) => {
              const resetLink = buildResetPasswordLink(input.passwordResetLink);

              if (ENV.NODE_ENV === "test" || IS_DEV) {
                logger.info(
                  `Password reset link for ${input.user.email}: ${resetLink}`,
                );
                return;
              }

              logger.info(
                `Password reset requested for ${input.user.email}; email delivery is disabled in this environment.`,
              );
            },
          },
        },
        override: {
          functions(originalImplementation) {
            return {
              ...originalImplementation,
              async createNewRecipeUser(input) {
                const response =
                  await originalImplementation.createNewRecipeUser(input);

                if (response.status !== "OK") {
                  return response;
                }

                await ensureExternalUserIdMapping(
                  response.recipeUserId.getAsString(),
                );
                return response;
              },
            };
          },
          apis(originalImplementation) {
            return {
              ...originalImplementation,
              async signUpPOST(input) {
                if (!originalImplementation.signUpPOST) {
                  throw new BaseError(
                    "signUpPOST not implemented",
                    "signUpPOST not implemented",
                    Status.BAD_REQUEST,
                    true,
                  );
                }

                const response = await originalImplementation.signUpPOST(input);

                if (response.status === "OK") {
                  const email = getFormFieldValue(input.formFields, "email");
                  const name = getFormFieldValue(input.formFields, "name");
                  const userId = response.session.getUserId();

                  if (email) {
                    await userService.upsertUserFromAuth({
                      userId,
                      email,
                      name,
                    });
                  }
                }

                return response;
              },
              async signInPOST(input) {
                if (!originalImplementation.signInPOST) {
                  throw new BaseError(
                    "signInPOST not implemented",
                    "signInPOST not implemented",
                    Status.BAD_REQUEST,
                    true,
                  );
                }

                const response = await originalImplementation.signInPOST(input);

                if (response.status === "OK") {
                  const email = getFormFieldValue(input.formFields, "email");
                  const userId = response.session.getUserId();

                  if (email) {
                    await userService.upsertUserFromAuth({ userId, email });
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

                await userMetadataService.updateUserMetadata({
                  userId: userId.toString(),
                  data: { sync: { incrementalGCalSync: "RESTART" } },
                });

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
