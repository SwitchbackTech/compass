import cors from "cors";
import { ObjectId } from "mongodb";
import superTokensNode from "supertokens-node";
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
import googleAuthService from "@backend/auth/services/google/google.auth.service";
import { ENV } from "@backend/common/constants/env.constants";
import {
  initSupertokens,
  supertokensCors,
} from "@backend/common/middleware/supertokens.middleware";
import {
  buildResetPasswordLink,
  createGoogleSignInSuccess,
  ensureExternalUserIdMapping,
} from "@backend/common/middleware/supertokens.middleware.util";
import type * as SupertokensMiddlewareUtilModule from "@backend/common/middleware/supertokens.middleware.util";
import userService from "@backend/user/services/user.service";

jest.mock("cors", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("supertokens-node", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    getAllCORSHeaders: jest.fn(() => ["x-sut-header"]),
    convertToRecipeUserId: jest.fn((id: string) => `recipe_${id}`),
  },
  User: jest.fn(),
  getUser: jest.fn(),
}));

jest.mock("supertokens-node/recipe/dashboard", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
  },
}));

jest.mock("supertokens-node/recipe/emailpassword", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
  },
}));

jest.mock("supertokens-node/recipe/session", () => ({
  __esModule: true,
  default: {
    createNewSession: jest.fn(),
    init: jest.fn(),
    getAllSessionHandlesForUser: jest.fn(),
    revokeSession: jest.fn(),
  },
}));

jest.mock("supertokens-node/recipe/thirdparty", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
  },
}));

jest.mock("supertokens-node/recipe/usermetadata", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
  },
}));

jest.mock("@backend/auth/services/google/google.auth.service", () => ({
  __esModule: true,
  default: {
    getConnectedCompassUserId: jest.fn(),
    handleGoogleAuth: jest.fn(),
  },
}));

jest.mock("@backend/common/services/mongo.service", () => ({
  __esModule: true,
  default: {
    user: {
      findOne: jest.fn(),
    },
  },
}));

jest.mock("@backend/user/services/user.service", () => ({
  __esModule: true,
  default: {
    handleLogoutCleanup: jest.fn(),
    upsertUserFromAuth: jest.fn(),
  },
}));

jest.mock("@backend/common/middleware/supertokens.middleware.util", () => {
  const actual = jest.requireActual<typeof SupertokensMiddlewareUtilModule>(
    "@backend/common/middleware/supertokens.middleware.util",
  );
  return {
    ...actual,
    buildResetPasswordLink: jest.fn(),
    createGoogleSignInSuccess: jest.fn(),
    ensureExternalUserIdMapping: jest.fn(),
    getFormFieldValue: jest.fn(),
  };
});

type MockCallSource = { mock: { calls: unknown[][] } };

const getFirstCallArg = <T>(mockFn: MockCallSource): T => {
  const firstCall = mockFn.mock.calls.at(0);

  if (!firstCall) {
    throw new Error("Expected the mock to have been called");
  }

  return firstCall[0] as T;
};

const mockedCors = jest.mocked(cors);
const mockedDashboardInit = jest.mocked(Dashboard.init);
const mockedEmailPasswordInit = jest.mocked(EmailPassword.init);
const mockedGetAllSessionHandlesForUser = jest.mocked(
  Session.getAllSessionHandlesForUser,
);
const mockedGetAllSupertokensCorsHeaders = jest.mocked(
  superTokensNode.getAllCORSHeaders,
);
const mockedGetConnectedCompassUserId = jest.mocked(
  googleAuthService.getConnectedCompassUserId,
);
const mockedSessionCreateNewSession = jest.mocked(Session.createNewSession);
const mockedSessionInit = jest.mocked(Session.init);
const mockedSessionRevokeSession = jest.mocked(Session.revokeSession);
const mockedSuperTokensInit = jest.mocked(superTokensNode.init);
const mockedThirdPartyInit = jest.mocked(ThirdParty.init);
const mockedUserMetadataInit = jest.mocked(UserMetadata.init);

describe("supertokens.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Ensure recipe init methods return stable values so we can assert
    // the `recipeList` composition.
    mockedThirdPartyInit.mockReturnValue({ recipe: "thirdparty" });
    mockedEmailPasswordInit.mockReturnValue({
      recipe: "emailpassword",
    });
    mockedDashboardInit.mockReturnValue({ recipe: "dashboard" });
    mockedSessionInit.mockReturnValue({ recipe: "session" });
    mockedUserMetadataInit.mockReturnValue({
      recipe: "usermetadata",
    });
    mockedGetConnectedCompassUserId.mockResolvedValue(null);
  });

  describe("initSupertokens", () => {
    it("calls SuperTokens.init with appInfo, credentials, and recipeList", () => {
      initSupertokens();

      expect(mockedSuperTokensInit).toHaveBeenCalledTimes(1);
      const initArg = getFirstCallArg<{
        appInfo: Record<string, unknown>;
        framework: string;
        recipeList: unknown[];
        supertokens: Record<string, unknown>;
      }>(mockedSuperTokensInit);

      expect(initArg.appInfo).toMatchObject({
        appName: APP_NAME,
        apiBasePath: "/api",
        apiDomain: `http://localhost:${PORT_DEFAULT_BACKEND}`,
        websiteBasePath: "/login",
        websiteDomain: `http://localhost:${PORT_DEFAULT_WEB}`,
      });

      expect(initArg.supertokens).toMatchObject({
        connectionURI: ENV.SUPERTOKENS_URI,
        apiKey: ENV.SUPERTOKENS_KEY,
      });

      expect(initArg.framework).toBe("express");

      expect(initArg.recipeList).toEqual([
        { recipe: "thirdparty" },
        { recipe: "emailpassword" },
        { recipe: "dashboard" },
        { recipe: "session" },
        { recipe: "usermetadata" },
      ]);
    });

    it("wires EmailPassword name validation", async () => {
      initSupertokens();

      const emailPasswordConfig = getFirstCallArg<{
        signUpFeature: {
          formFields: Array<{
            id: string;
            validate: (value: unknown) => Promise<string | undefined>;
          }>;
        };
      }>(mockedEmailPasswordInit);

      const firstField = emailPasswordConfig.signUpFeature.formFields.at(0);
      if (!firstField) {
        throw new Error("Expected a single EmailPassword signUp form field");
      }
      const validate = firstField.validate;

      await expect(validate("")).resolves.toBe("Name is required");
      await expect(validate("   ")).resolves.toBe("Name is required");
      await expect(validate("Tyler")).resolves.toBeUndefined();
    });

    it("rewrites password reset links in EmailPassword sendEmail", async () => {
      (buildResetPasswordLink as jest.Mock).mockReturnValue(
        "http://app/reset?token=rewritten",
      );

      initSupertokens();

      const emailPasswordConfig = getFirstCallArg<{
        emailDelivery: {
          override: (originalImplementation: { sendEmail: jest.Mock }) => {
            sendEmail: (input: {
              passwordResetLink: string;
              user: { email: string };
            }) => Promise<void>;
          };
        };
      }>(mockedEmailPasswordInit);

      const originalSendEmail = jest.fn().mockResolvedValue(undefined);
      const overridden = emailPasswordConfig.emailDelivery.override({
        sendEmail: originalSendEmail,
      });

      await overridden.sendEmail({
        passwordResetLink:
          "http://localhost:1234/auth/reset-password?token=abc",
        user: { email: "user@example.com" },
      });

      expect(buildResetPasswordLink).toHaveBeenCalledWith(
        "http://localhost:1234/auth/reset-password?token=abc",
        ENV.FRONTEND_URL,
      );
      // In test env, sending is suppressed — originalSendEmail must not be called
      expect(originalSendEmail).not.toHaveBeenCalled();
    });

    it("preserves EmailPassword API method context in signUpPOST and signInPOST overrides", async () => {
      initSupertokens();

      const emailPasswordConfig = getFirstCallArg<{
        override: {
          apis: (originalImplementation: {
            signUpPOST?: (input: unknown) => Promise<unknown>;
            signInPOST?: (input: unknown) => Promise<unknown>;
          }) => {
            signUpPOST: (input: unknown) => Promise<unknown>;
            signInPOST: (input: unknown) => Promise<unknown>;
          };
        };
      }>(mockedEmailPasswordInit);

      const originalImplementation = {
        signUpPOST: jest.fn(function (this: unknown, input: unknown) {
          return Promise.resolve({
            status: "EMAIL_ALREADY_EXISTS_ERROR",
            input,
          });
        }),
        signInPOST: jest.fn(function (this: unknown, input: unknown) {
          return Promise.resolve({
            status: "WRONG_CREDENTIALS_ERROR",
            input,
          });
        }),
      };

      const overridden = emailPasswordConfig.override.apis(
        originalImplementation,
      );

      await overridden.signUpPOST({ email: "user@example.com" });
      await overridden.signInPOST({ email: "user@example.com" });

      expect(originalImplementation.signUpPOST).toHaveBeenCalledWith({
        email: "user@example.com",
      });
      expect(originalImplementation.signInPOST).toHaveBeenCalledWith({
        email: "user@example.com",
      });
      expect(originalImplementation.signUpPOST.mock.contexts[0]).toBe(
        originalImplementation,
      );
      expect(originalImplementation.signInPOST.mock.contexts[0]).toBe(
        originalImplementation,
      );
    });

    it("keeps the original EmailPassword recipe user during createNewRecipeUser", async () => {
      initSupertokens();

      const emailPasswordConfig = getFirstCallArg<{
        override: {
          functions: (originalImplementation: {
            createNewRecipeUser: (input: unknown) => Promise<unknown>;
          }) => {
            createNewRecipeUser: (input: unknown) => Promise<unknown>;
          };
        };
      }>(mockedEmailPasswordInit);

      const originalUser = {
        id: "recipe-user-id",
        loginMethods: [
          {
            recipeUserId: {
              getAsString: () => "recipe-user-id",
            },
          },
        ],
      };

      const responsePayload = {
        status: "OK" as const,
        recipeUserId: {
          getAsString: () => "recipe-user-id",
        },
        user: originalUser,
      };

      const originalImplementation = {
        createNewRecipeUser: jest.fn().mockResolvedValue(responsePayload),
      };

      const overridden = emailPasswordConfig.override.functions(
        originalImplementation,
      );

      const result = await overridden.createNewRecipeUser({
        email: "user@example.com",
      });

      expect(originalImplementation.createNewRecipeUser).toHaveBeenCalledWith({
        email: "user@example.com",
      });
      expect(ensureExternalUserIdMapping).toHaveBeenCalledWith(
        "recipe-user-id",
      );
      expect(result).toBe(responsePayload);
    });

    it("preserves ThirdParty linking behavior while ensuring a user id mapping", async () => {
      initSupertokens();

      const thirdPartyConfig = getFirstCallArg<{
        override: {
          functions: (originalImplementation: {
            manuallyCreateOrUpdateUser: (input: unknown) => Promise<unknown>;
          }) => {
            manuallyCreateOrUpdateUser: (input: unknown) => Promise<unknown>;
          };
        };
      }>(mockedThirdPartyInit);

      const responsePayload = {
        status: "OK" as const,
        recipeUserId: {
          getAsString: () => "recipe-user-id",
        },
        user: { id: "recipe-user-id" },
        createdNewRecipeUser: false,
      };

      const originalImplementation = {
        manuallyCreateOrUpdateUser: jest
          .fn()
          .mockResolvedValue(responsePayload),
      };

      const overridden = thirdPartyConfig.override.functions(
        originalImplementation,
      );

      const result = await overridden.manuallyCreateOrUpdateUser({
        email: "user@example.com",
      });

      expect(
        originalImplementation.manuallyCreateOrUpdateUser,
      ).toHaveBeenCalledWith({
        email: "user@example.com",
      });
      expect(ensureExternalUserIdMapping).toHaveBeenCalledWith(
        "recipe-user-id",
      );
      expect(result).toBe(responsePayload);
    });

    it("calls googleAuthService.handleGoogleAuth when ThirdParty signInUpPOST succeeds", async () => {
      const responsePayload = { status: "OK" };
      const successPayload = { providerUser: { id: "u1" } };

      (createGoogleSignInSuccess as jest.Mock).mockReturnValue(successPayload);

      initSupertokens();

      const thirdPartyConfig = getFirstCallArg<{
        override: {
          apis: (originalImplementation: {
            signInUpPOST?: (input: unknown) => Promise<unknown>;
          }) => {
            signInUpPOST: (input: unknown) => Promise<unknown>;
          };
        };
      }>(mockedThirdPartyInit);

      const originalImplementation = {
        signInUpPOST: jest.fn().mockResolvedValue(responsePayload),
      };

      const overridden = thirdPartyConfig.override.apis(originalImplementation);

      await overridden.signInUpPOST({ some: "input" });

      expect(originalImplementation.signInUpPOST).toHaveBeenCalledWith({
        some: "input",
      });
      expect(googleAuthService.handleGoogleAuth).toHaveBeenCalledWith(
        successPayload,
      );
    });

    it("replaces the Google session with the connected Compass session", async () => {
      const googleSession = {
        getHandle: () => "google-session",
        getUserId: () => "google-user-id",
      };
      const compassSession = {
        getHandle: () => "compass-session",
        getUserId: () => "compass-user-id",
      };
      const responsePayload = {
        status: "OK" as const,
        session: googleSession,
      };
      const successPayload = {
        providerUser: { sub: "google-sub" },
        oAuthTokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        createdNewRecipeUser: false,
        recipeUserId: "google-user-id",
        loginMethodsLength: 1,
      };

      (createGoogleSignInSuccess as jest.Mock).mockReturnValue(successPayload);
      mockedGetConnectedCompassUserId.mockResolvedValue("compass-user-id");
      mockedSessionCreateNewSession.mockResolvedValue(compassSession as never);
      mockedSessionRevokeSession.mockResolvedValue(true);

      initSupertokens();

      const thirdPartyConfig = getFirstCallArg<{
        override: {
          apis: (originalImplementation: {
            signInUpPOST?: (input: unknown) => Promise<unknown>;
          }) => {
            signInUpPOST: (input: {
              options: { req: unknown; res: unknown };
            }) => Promise<unknown>;
          };
        };
      }>(mockedThirdPartyInit);
      const originalImplementation = {
        signInUpPOST: jest.fn().mockResolvedValue(responsePayload),
      };
      const overridden = thirdPartyConfig.override.apis(originalImplementation);
      const req = { method: "POST" };
      const res = { statusCode: 200 };

      const result = await overridden.signInUpPOST({
        options: { req, res },
      });

      expect(mockedSessionCreateNewSession).toHaveBeenCalledWith(
        req,
        res,
        "public",
        "recipe_compass-user-id",
      );
      expect(mockedSessionRevokeSession).toHaveBeenCalledWith("google-session");
      expect(result).toEqual({
        status: "OK",
        session: compassSession,
      });
    });

    it("does not call googleAuthService.handleGoogleAuth when ThirdParty signInUpPOST returns null success", async () => {
      const responsePayload = { status: "SIGN_IN_UP_NOT_ALLOWED" };
      (createGoogleSignInSuccess as jest.Mock).mockReturnValue(null);

      initSupertokens();

      const thirdPartyConfig = getFirstCallArg<{
        override: {
          apis: (originalImplementation: {
            signInUpPOST?: (input: unknown) => Promise<unknown>;
          }) => {
            signInUpPOST: (input: unknown) => Promise<unknown>;
          };
        };
      }>(mockedThirdPartyInit);

      const originalImplementation = {
        signInUpPOST: jest.fn().mockResolvedValue(responsePayload),
      };

      const overridden = thirdPartyConfig.override.apis(originalImplementation);

      await overridden.signInUpPOST({ some: "input" });

      expect(googleAuthService.handleGoogleAuth).not.toHaveBeenCalled();
    });

    it("delegates logout cleanup for the last active Session in signOutPOST", async () => {
      const userId = new ObjectId().toString();
      mockedGetAllSessionHandlesForUser.mockResolvedValue([{ handle: "h1" }]);

      const originalImplementation = {
        marker: "ok" as const,
        signOutPOST: jest.fn(function (this: { marker: string }) {
          return Promise.resolve({ res: this.marker });
        }),
      };

      (userService.handleLogoutCleanup as jest.Mock).mockResolvedValue(
        undefined,
      );

      initSupertokens();

      const sessionConfig = getFirstCallArg<{
        override: {
          apis: (original: typeof originalImplementation) => {
            signOutPOST: (input: unknown) => Promise<unknown>;
          };
        };
      }>(mockedSessionInit);

      const overridden = sessionConfig.override.apis(originalImplementation);

      const result = await overridden.signOutPOST({
        session: {
          getUserId: () => userId,
        },
      });

      const signOutInput = getFirstCallArg<{
        session: { getUserId: () => string };
      }>(originalImplementation.signOutPOST);
      expect(signOutInput.session.getUserId()).toBe(userId);
      expect(userService.handleLogoutCleanup).toHaveBeenCalledWith(userId, {
        isLastActiveSession: true,
      });
      expect(result).toEqual({ res: "ok" });
    });

    it("returns the sign-out response when logout cleanup fails", async () => {
      const userId = new ObjectId().toString();
      mockedGetAllSessionHandlesForUser.mockResolvedValue([{ handle: "h1" }]);

      const originalImplementation = {
        signOutPOST: jest.fn().mockResolvedValue({ res: "ok" }),
      };

      (userService.handleLogoutCleanup as jest.Mock).mockRejectedValue(
        new Error("cleanup failed"),
      );

      initSupertokens();

      const sessionConfig = getFirstCallArg<{
        override: {
          apis: (original: typeof originalImplementation) => {
            signOutPOST: (input: unknown) => Promise<unknown>;
          };
        };
      }>(mockedSessionInit);

      const overridden = sessionConfig.override.apis(originalImplementation);

      await expect(
        overridden.signOutPOST({
          session: {
            getUserId: () => userId,
          },
        }),
      ).resolves.toEqual({ res: "ok" });
    });

    it("passes non-last-session state to logout cleanup", async () => {
      const userId = new ObjectId().toString();
      mockedGetAllSessionHandlesForUser.mockResolvedValue([
        { handle: "h1" },
        { handle: "h2" },
      ]);

      const originalImplementation = {
        signOutPOST: jest.fn().mockResolvedValue({ res: "ok" }),
      };

      (userService.handleLogoutCleanup as jest.Mock).mockResolvedValue(
        undefined,
      );

      initSupertokens();

      const sessionConfig = getFirstCallArg<{
        override: {
          apis: (original: typeof originalImplementation) => {
            signOutPOST: (input: unknown) => Promise<unknown>;
          };
        };
      }>(mockedSessionInit);

      const overridden = sessionConfig.override.apis(originalImplementation);

      await overridden.signOutPOST({
        session: {
          getUserId: () => userId,
        },
      });

      expect(userService.handleLogoutCleanup).toHaveBeenCalledWith(userId, {
        isLastActiveSession: false,
      });
    });
  });

  describe("supertokensCors", () => {
    it("creates a cors middleware using SuperTokens CORS headers", () => {
      const corsReturn = jest.fn();
      mockedCors.mockReturnValue(corsReturn);

      mockedGetAllSupertokensCorsHeaders.mockReturnValue(["st-auth-mode"]);

      const middleware = supertokensCors();

      expect(middleware).toBe(corsReturn);
      expect(mockedCors).toHaveBeenCalledTimes(1);

      const arg = getFirstCallArg<{
        allowedHeaders: string[];
        credentials: boolean;
        origin: string;
      }>(mockedCors);
      expect(arg.credentials).toBe(true);
      expect(arg.origin).toBe("http://localhost:9080");

      expect(arg.allowedHeaders).toEqual([
        "content-type",
        "st-auth-mode",
        "st-auth-mode",
      ]);
    });
  });
});
