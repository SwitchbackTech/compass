import cors from "cors";
import { ObjectId } from "mongodb";
import superTokensNode from "supertokens-node";
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
import googleAuthService from "@backend/auth/services/google/google.auth.service";
import { ENV } from "@backend/common/constants/env.constants";
import {
  initSupertokens,
  supertokensCors,
} from "@backend/common/middleware/supertokens.middleware";
import {
  buildResetPasswordLink,
  createGoogleSignInSuccess,
} from "@backend/common/middleware/supertokens.middleware.util";
import syncService from "@backend/sync/services/sync.service";
import userMetadataService from "@backend/user/services/user-metadata.service";

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

jest.mock("supertokens-node/recipe/accountlinking", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
  },
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
    init: jest.fn(),
    getAllSessionHandlesForUser: jest.fn(),
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

jest.mock("@backend/sync/services/sync.service", () => ({
  __esModule: true,
  default: {
    stopWatches: jest.fn(),
  },
}));

jest.mock("@backend/user/services/user-metadata.service", () => ({
  __esModule: true,
  default: {
    updateUserMetadata: jest.fn(),
  },
}));

jest.mock("@backend/user/services/user.service", () => ({
  __esModule: true,
  default: {
    upsertUserFromAuth: jest.fn(),
  },
}));

jest.mock("@backend/common/middleware/supertokens.middleware.util", () => {
  const actual = jest.requireActual(
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

const mockedCors = cors as unknown as jest.Mock;
const mockedSuperTokensInit = (superTokensNode as typeof superTokensNode)
  .init as jest.Mock;

describe("supertokens.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Ensure recipe init methods return stable values so we can assert
    // the `recipeList` composition.
    (AccountLinking.init as jest.Mock).mockReturnValue({
      recipe: "accountlinking",
    });
    (ThirdParty.init as jest.Mock).mockReturnValue({ recipe: "thirdparty" });
    (EmailPassword.init as jest.Mock).mockReturnValue({
      recipe: "emailpassword",
    });
    (Dashboard.init as jest.Mock).mockReturnValue({ recipe: "dashboard" });
    (Session.init as jest.Mock).mockReturnValue({ recipe: "session" });
    (UserMetadata.init as jest.Mock).mockReturnValue({
      recipe: "usermetadata",
    });
  });

  describe("initSupertokens", () => {
    it("calls SuperTokens.init with appInfo, credentials, and recipeList", () => {
      initSupertokens();

      expect(mockedSuperTokensInit).toHaveBeenCalledTimes(1);
      const initArg = mockedSuperTokensInit.mock.calls[0][0];

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
        { recipe: "accountlinking" },
        { recipe: "thirdparty" },
        { recipe: "emailpassword" },
        { recipe: "dashboard" },
        { recipe: "session" },
        { recipe: "usermetadata" },
      ]);
    });

    it("wires AccountLinking.shouldDoAutomaticAccountLinking to disable automatic linking", async () => {
      initSupertokens();

      const shouldDoAutomaticAccountLinking = (AccountLinking.init as jest.Mock)
        .mock.calls[0][0].shouldDoAutomaticAccountLinking as (newAccountInfo: {
        email?: string;
      }) => Promise<{
        shouldAutomaticallyLink: boolean;
        shouldRequireVerification?: boolean;
      }>;

      const disabled = { shouldAutomaticallyLink: false };

      await expect(shouldDoAutomaticAccountLinking({})).resolves.toEqual(
        disabled,
      );
      await expect(
        shouldDoAutomaticAccountLinking({ email: "a@example.com" }),
      ).resolves.toEqual(disabled);
    });

    it("wires EmailPassword name validation", async () => {
      initSupertokens();

      const emailPasswordConfig = (EmailPassword.init as jest.Mock).mock
        .calls[0][0] as {
        signUpFeature: {
          formFields: Array<{
            id: string;
            validate: (value: unknown) => Promise<string | undefined>;
          }>;
        };
      };

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

      const emailPasswordConfig = (EmailPassword.init as jest.Mock).mock
        .calls[0][0] as {
        emailDelivery: {
          override: (originalImplementation: { sendEmail: jest.Mock }) => {
            sendEmail: (input: {
              passwordResetLink: string;
              user: { email: string };
            }) => Promise<void>;
          };
        };
      };

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

    it("calls googleAuthService.handleGoogleAuth when ThirdParty signInUpPOST succeeds", async () => {
      const responsePayload = { status: "OK" };
      const successPayload = { providerUser: { id: "u1" } };

      (createGoogleSignInSuccess as jest.Mock).mockReturnValue(successPayload);

      initSupertokens();

      const thirdPartyConfig = (ThirdParty.init as jest.Mock).mock
        .calls[0][0] as {
        override: {
          apis: (originalImplementation: {
            signInUpPOST?: (input: unknown) => Promise<unknown>;
          }) => {
            signInUpPOST: (input: unknown) => Promise<unknown>;
          };
        };
      };

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

    it("does not call googleAuthService.handleGoogleAuth when ThirdParty signInUpPOST returns null success", async () => {
      const responsePayload = { status: "SIGN_IN_UP_NOT_ALLOWED" };
      (createGoogleSignInSuccess as jest.Mock).mockReturnValue(null);

      initSupertokens();

      const thirdPartyConfig = (ThirdParty.init as jest.Mock).mock
        .calls[0][0] as {
        override: {
          apis: (originalImplementation: {
            signInUpPOST?: (input: unknown) => Promise<unknown>;
          }) => {
            signInUpPOST: (input: unknown) => Promise<unknown>;
          };
        };
      };

      const originalImplementation = {
        signInUpPOST: jest.fn().mockResolvedValue(responsePayload),
      };

      const overridden = thirdPartyConfig.override.apis(originalImplementation);

      await overridden.signInUpPOST({ some: "input" });

      expect(googleAuthService.handleGoogleAuth).not.toHaveBeenCalled();
    });

    it("updates sync metadata and stops watches for last active Session in signOutPOST", async () => {
      const userId = new ObjectId().toString();
      (Session.getAllSessionHandlesForUser as jest.Mock).mockResolvedValue([
        { handle: "h1" },
      ]);

      const originalImplementation = {
        signOutPOST: jest.fn().mockResolvedValue({ res: "ok" }),
      };

      (userMetadataService.updateUserMetadata as jest.Mock).mockResolvedValue(
        {},
      );
      (syncService.stopWatches as jest.Mock).mockResolvedValue(undefined);

      initSupertokens();

      const sessionConfig = (Session.init as jest.Mock).mock.calls[0][0] as {
        override: {
          apis: (original: typeof originalImplementation) => {
            signOutPOST: (input: unknown) => Promise<unknown>;
          };
        };
      };

      const overridden = sessionConfig.override.apis(originalImplementation);

      const result = await overridden.signOutPOST({
        session: {
          getUserId: () => userId,
        },
      });

      expect(originalImplementation.signOutPOST).toHaveBeenCalledWith({
        session: { getUserId: expect.any(Function) },
      });
      expect(userMetadataService.updateUserMetadata).toHaveBeenCalledWith({
        userId,
        data: { sync: { incrementalGCalSync: "RESTART" } },
      });
      expect(syncService.stopWatches).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ res: "ok" });
    });

    it("does not stop watches when Session.signOutPOST is not last active session", async () => {
      const userId = new ObjectId().toString();
      (Session.getAllSessionHandlesForUser as jest.Mock).mockResolvedValue([
        { handle: "h1" },
        { handle: "h2" },
      ]);

      const originalImplementation = {
        signOutPOST: jest.fn().mockResolvedValue({ res: "ok" }),
      };

      (userMetadataService.updateUserMetadata as jest.Mock).mockResolvedValue(
        {},
      );

      initSupertokens();

      const sessionConfig = (Session.init as jest.Mock).mock.calls[0][0] as {
        override: {
          apis: (original: typeof originalImplementation) => {
            signOutPOST: (input: unknown) => Promise<unknown>;
          };
        };
      };

      const overridden = sessionConfig.override.apis(originalImplementation);

      await overridden.signOutPOST({
        session: {
          getUserId: () => userId,
        },
      });

      expect(userMetadataService.updateUserMetadata).toHaveBeenCalledWith({
        userId,
        data: { sync: { incrementalGCalSync: "RESTART" } },
      });
      expect(syncService.stopWatches).not.toHaveBeenCalled();
    });
  });

  describe("supertokensCors", () => {
    it("creates a cors middleware using SuperTokens CORS headers", () => {
      const corsReturn = jest.fn();
      mockedCors.mockReturnValue(corsReturn);

      (superTokensNode.getAllCORSHeaders as jest.Mock).mockReturnValue([
        "st-auth-mode",
      ]);

      const middleware = supertokensCors();

      expect(middleware).toBe(corsReturn);
      expect(mockedCors).toHaveBeenCalledTimes(1);

      const arg = mockedCors.mock.calls[0][0];
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
