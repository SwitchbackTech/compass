import * as corsLib from "cors";
import { ObjectId } from "mongodb";
import superTokensNode from "supertokens-node";
import Dashboard from "supertokens-node/recipe/dashboard";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import UserMetadata from "supertokens-node/recipe/usermetadata";
import { APP_NAME } from "@core/constants/core.constants";
import { googleAuthService } from "@backend/auth/services/google/google.auth.service";
import { CONFIG } from "@backend/common/constants/config.constants";
import {
  initSupertokens,
  supertokensCors,
} from "@backend/common/middleware/supertokens.middleware";
import * as supertokensMiddlewareUtil from "@backend/common/middleware/supertokens.middleware.util";
import {
  buildResetPasswordLink,
  createGoogleSignInSuccess,
  ensureExternalUserIdMapping,
  getFormFieldValue,
} from "@backend/common/middleware/supertokens.middleware.util";
import userService from "@backend/user/services/user.service";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

type MockCallSource = { mock: { calls: unknown[][] } };

const getFirstCallArg = <T>(mockFn: MockCallSource): T => {
  const firstCall = mockFn.mock.calls.at(0);

  if (!firstCall) {
    throw new Error("Expected the mock to have been called");
  }

  return firstCall[0] as T;
};

describe("supertokens.middleware", () => {
  beforeEach(() => {
    spyOn(corsLib, "default");
    spyOn(superTokensNode, "init").mockImplementation(() => undefined);
    spyOn(superTokensNode, "getAllCORSHeaders").mockReturnValue([
      "x-sut-header",
    ]);
    spyOn(superTokensNode, "convertToRecipeUserId").mockImplementation(
      (id: string) =>
        `recipe_${id}` as ReturnType<
          typeof superTokensNode.convertToRecipeUserId
        >,
    );
    spyOn(Dashboard, "init");
    spyOn(EmailPassword, "init");
    spyOn(Session, "getAllSessionHandlesForUser");
    spyOn(Session, "createNewSession");
    spyOn(Session, "init");
    spyOn(Session, "revokeSession");
    spyOn(ThirdParty, "init");
    spyOn(UserMetadata, "init");
    spyOn(googleAuthService, "handleGoogleAuth").mockResolvedValue(undefined);
    spyOn(userService, "getCanonicalCompassUserId").mockResolvedValue(null);
    spyOn(userService, "handleLogoutCleanup").mockResolvedValue(undefined);
    spyOn(userService, "upsertUserFromAuth").mockResolvedValue({
      user: { userId: "compass-user-id" },
      isNewUser: false,
    });
    spyOn(
      supertokensMiddlewareUtil,
      "buildResetPasswordLink",
    ).mockImplementation((link) => link);
    spyOn(
      supertokensMiddlewareUtil,
      "createGoogleSignInSuccess",
    ).mockImplementation((payload) => payload as never);
    spyOn(
      supertokensMiddlewareUtil,
      "ensureExternalUserIdMapping",
    ).mockResolvedValue(undefined);
    spyOn(supertokensMiddlewareUtil, "getFormFieldValue").mockReturnValue(
      undefined,
    );

    (corsLib.default as Mock).mockClear();
    (superTokensNode.init as Mock).mockClear();
    (Dashboard.init as Mock).mockClear();
    (EmailPassword.init as Mock).mockClear();
    (Session.getAllSessionHandlesForUser as Mock).mockClear();
    (Session.createNewSession as Mock).mockClear();
    (Session.init as Mock).mockClear();
    (Session.revokeSession as Mock).mockClear();
    (ThirdParty.init as Mock).mockClear();
    (UserMetadata.init as Mock).mockClear();
    (googleAuthService.handleGoogleAuth as Mock).mockClear();
    (userService.getCanonicalCompassUserId as Mock).mockClear();
    (userService.handleLogoutCleanup as Mock).mockClear();
    (userService.upsertUserFromAuth as Mock).mockClear();
    (supertokensMiddlewareUtil.buildResetPasswordLink as Mock).mockClear();
    (supertokensMiddlewareUtil.createGoogleSignInSuccess as Mock).mockClear();
    (supertokensMiddlewareUtil.ensureExternalUserIdMapping as Mock).mockClear();
    (supertokensMiddlewareUtil.getFormFieldValue as Mock).mockClear();

    // Ensure recipe init methods return stable values so we can assert
    // the `recipeList` composition.
    (ThirdParty.init as Mock).mockReturnValue({
      recipe: "thirdparty",
    } as never);
    (EmailPassword.init as Mock).mockReturnValue({
      recipe: "emailpassword",
    } as never);
    (Dashboard.init as Mock).mockReturnValue({ recipe: "dashboard" } as never);
    (Session.init as Mock).mockReturnValue({ recipe: "session" } as never);
    (UserMetadata.init as Mock).mockReturnValue({
      recipe: "usermetadata",
    } as never);
    (userService.getCanonicalCompassUserId as Mock).mockResolvedValue(null);
  });

  describe("initSupertokens", () => {
    it("calls SuperTokens.init with appInfo, credentials, and recipeList", () => {
      initSupertokens();

      expect(superTokensNode.init).toHaveBeenCalledTimes(1);
      const initArg = getFirstCallArg<{
        appInfo: Record<string, unknown>;
        framework: string;
        recipeList: unknown[];
        supertokens: Record<string, unknown>;
      }>(superTokensNode.init);

      expect(initArg.appInfo).toMatchObject({
        appName: APP_NAME,
        apiBasePath: "/api",
        apiDomain: new URL(CONFIG.BASEURL).origin,
        websiteBasePath: "/login",
        websiteDomain: new URL(CONFIG.FRONTEND_URL).origin,
      });

      expect(initArg.supertokens).toMatchObject({
        connectionURI: CONFIG.SUPERTOKENS_URI,
        apiKey: CONFIG.SUPERTOKENS_KEY,
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

    it("uses configured public URLs for SuperTokens domains", () => {
      const originalBaseUrl = CONFIG.BASEURL;
      const originalFrontendUrl = CONFIG.FRONTEND_URL;

      CONFIG.BASEURL = "https://compass.example.com/api";
      CONFIG.FRONTEND_URL = "https://compass.example.com";

      try {
        initSupertokens();

        const initArg = getFirstCallArg<{
          appInfo: Record<string, unknown>;
        }>(superTokensNode.init);

        expect(initArg.appInfo).toMatchObject({
          apiDomain: "https://compass.example.com",
          websiteDomain: "https://compass.example.com",
        });
      } finally {
        CONFIG.BASEURL = originalBaseUrl;
        CONFIG.FRONTEND_URL = originalFrontendUrl;
      }
    });

    it("omits the Google third-party provider when Google is not configured", () => {
      const originalClientId = CONFIG.GOOGLE_CLIENT_ID;
      const originalClientSecret = CONFIG.GOOGLE_CLIENT_SECRET;
      CONFIG.GOOGLE_CLIENT_ID = undefined;
      CONFIG.GOOGLE_CLIENT_SECRET = undefined;

      try {
        initSupertokens();
      } finally {
        CONFIG.GOOGLE_CLIENT_ID = originalClientId;
        CONFIG.GOOGLE_CLIENT_SECRET = originalClientSecret;
      }

      expect(ThirdParty.init).not.toHaveBeenCalled();
      const initArg = getFirstCallArg<{
        recipeList: unknown[];
      }>(superTokensNode.init);

      expect(initArg.recipeList).toEqual([
        { recipe: "emailpassword" },
        { recipe: "dashboard" },
        { recipe: "session" },
        { recipe: "usermetadata" },
      ]);
    });

    it("omits the Google third-party provider when credentials are absent", () => {
      const originalClientId = CONFIG.GOOGLE_CLIENT_ID;
      const originalClientSecret = CONFIG.GOOGLE_CLIENT_SECRET;
      CONFIG.GOOGLE_CLIENT_ID = undefined;
      CONFIG.GOOGLE_CLIENT_SECRET = undefined;

      try {
        initSupertokens();
      } finally {
        CONFIG.GOOGLE_CLIENT_ID = originalClientId;
        CONFIG.GOOGLE_CLIENT_SECRET = originalClientSecret;
      }

      expect(ThirdParty.init).not.toHaveBeenCalled();
      const initArg = getFirstCallArg<{
        recipeList: unknown[];
      }>(superTokensNode.init);

      expect(initArg.recipeList).toEqual([
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
      }>(EmailPassword.init);

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
      (buildResetPasswordLink as Mock).mockReturnValue(
        "http://app/reset?token=rewritten",
      );

      initSupertokens();

      const emailPasswordConfig = getFirstCallArg<{
        emailDelivery: {
          override: (originalImplementation: { sendEmail: Mock }) => {
            sendEmail: (input: {
              passwordResetLink: string;
              user: { email: string };
            }) => Promise<void>;
          };
        };
      }>(EmailPassword.init);

      const originalSendEmail = mock().mockResolvedValue(undefined);
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
        CONFIG.FRONTEND_URL,
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
      }>(EmailPassword.init);

      const originalImplementation = {
        signUpPOST: mock(function (this: unknown, input: unknown) {
          return Promise.resolve({
            status: "EMAIL_ALREADY_EXISTS_ERROR",
            input,
          });
        }),
        signInPOST: mock(function (this: unknown, input: unknown) {
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
      }>(EmailPassword.init);

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
        createNewRecipeUser: mock().mockResolvedValue(responsePayload),
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
      }>(ThirdParty.init);

      const responsePayload = {
        status: "OK" as const,
        recipeUserId: {
          getAsString: () => "recipe-user-id",
        },
        user: { id: "recipe-user-id" },
        createdNewRecipeUser: false,
      };

      const originalImplementation = {
        manuallyCreateOrUpdateUser: mock().mockResolvedValue(responsePayload),
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

      (createGoogleSignInSuccess as Mock).mockReturnValue(successPayload);

      initSupertokens();

      const thirdPartyConfig = getFirstCallArg<{
        override: {
          apis: (originalImplementation: {
            signInUpPOST?: (input: unknown) => Promise<unknown>;
          }) => {
            signInUpPOST: (input: unknown) => Promise<unknown>;
          };
        };
      }>(ThirdParty.init);

      const originalImplementation = {
        signInUpPOST: mock().mockResolvedValue(responsePayload),
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

    it("replaces the EmailPassword sign-up session with the canonical Compass user", async () => {
      (userService.upsertUserFromAuth as Mock).mockResolvedValue({
        user: { userId: "compass-user-id" },
        isNewUser: false,
      });
      const googleSession = {
        getHandle: () => "signup-session",
        getUserId: () => "recipe-user-id",
      };
      const compassSession = {
        getHandle: () => "compass-session",
        getUserId: () => "compass-user-id",
      };

      initSupertokens();

      const emailPasswordConfig = getFirstCallArg<{
        override: {
          apis: (originalImplementation: {
            signUpPOST?: (input: unknown) => Promise<unknown>;
          }) => {
            signUpPOST: (input: {
              formFields: Array<{ id: string; value: string }>;
              options: { req: unknown; res: unknown };
            }) => Promise<unknown>;
          };
        };
      }>(EmailPassword.init);
      const originalImplementation = {
        signUpPOST: mock().mockResolvedValue({
          status: "OK" as const,
          session: googleSession,
        }),
      };
      (getFormFieldValue as Mock)
        .mockReturnValueOnce("user@example.com")
        .mockReturnValueOnce("User Name");
      Session.createNewSession.mockResolvedValue(compassSession as never);
      Session.revokeSession.mockResolvedValue(true);
      const overridden = emailPasswordConfig.override.apis(
        originalImplementation,
      );
      const req = { method: "POST" };
      const res = { statusCode: 200 };

      const result = await overridden.signUpPOST({
        formFields: [],
        options: { req, res },
      });

      expect(Session.createNewSession).toHaveBeenCalledWith(
        req,
        res,
        "public",
        "recipe_compass-user-id",
      );
      expect(Session.revokeSession).toHaveBeenCalledWith("signup-session");
      expect(result).toEqual({ status: "OK", session: compassSession });
    });

    it("replaces the EmailPassword sign-in session with the canonical Compass user", async () => {
      (userService.upsertUserFromAuth as Mock).mockResolvedValue({
        user: { userId: "compass-user-id" },
        isNewUser: false,
      });
      const googleSession = {
        getHandle: () => "signin-session",
        getUserId: () => "recipe-user-id",
      };
      const compassSession = {
        getHandle: () => "compass-session",
        getUserId: () => "compass-user-id",
      };

      initSupertokens();

      const emailPasswordConfig = getFirstCallArg<{
        override: {
          apis: (originalImplementation: {
            signInPOST?: (input: unknown) => Promise<unknown>;
          }) => {
            signInPOST: (input: {
              formFields: Array<{ id: string; value: string }>;
              options: { req: unknown; res: unknown };
            }) => Promise<unknown>;
          };
        };
      }>(EmailPassword.init);
      const originalImplementation = {
        signInPOST: mock().mockResolvedValue({
          status: "OK" as const,
          session: googleSession,
        }),
      };
      (getFormFieldValue as Mock).mockReturnValueOnce("user@example.com");
      Session.createNewSession.mockResolvedValue(compassSession as never);
      Session.revokeSession.mockResolvedValue(true);
      const overridden = emailPasswordConfig.override.apis(
        originalImplementation,
      );
      const req = { method: "POST" };
      const res = { statusCode: 200 };

      const result = await overridden.signInPOST({
        formFields: [],
        options: { req, res },
      });

      expect(Session.createNewSession).toHaveBeenCalledWith(
        req,
        res,
        "public",
        "recipe_compass-user-id",
      );
      expect(Session.revokeSession).toHaveBeenCalledWith("signin-session");
      expect(result).toEqual({ status: "OK", session: compassSession });
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
      const buildSuccessFromResponse = (response: {
        status: string;
        session?: { getUserId: () => string };
        user?: { id: string };
      }) => ({
        providerUser: { sub: "google-sub" },
        oAuthTokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        createdNewRecipeUser: false,
        recipeUserId:
          response.session?.getUserId() ??
          response.user?.id ??
          "google-user-id",
        loginMethodsLength: 1,
      });

      (createGoogleSignInSuccess as Mock).mockImplementation(
        buildSuccessFromResponse,
      );
      userService.getCanonicalCompassUserId.mockResolvedValue(
        "compass-user-id",
      );
      Session.createNewSession.mockResolvedValue(compassSession as never);
      Session.revokeSession.mockResolvedValue(true);

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
      }>(ThirdParty.init);
      const originalImplementation = {
        signInUpPOST: mock().mockResolvedValue(responsePayload),
      };
      const overridden = thirdPartyConfig.override.apis(originalImplementation);
      const req = { method: "POST" };
      const res = { statusCode: 200 };

      const result = await overridden.signInUpPOST({
        options: { req, res },
      });

      expect(Session.createNewSession).toHaveBeenCalledWith(
        req,
        res,
        "public",
        "recipe_compass-user-id",
      );
      expect(Session.revokeSession).toHaveBeenCalledWith("google-session");
      expect(result).toEqual({
        status: "OK",
        session: compassSession,
      });
      expect(createGoogleSignInSuccess).toHaveBeenCalledTimes(2);
      expect(googleAuthService.handleGoogleAuth).toHaveBeenCalledWith(
        expect.objectContaining({ recipeUserId: "compass-user-id" }),
      );
    });

    it("does not call googleAuthService.handleGoogleAuth when ThirdParty signInUpPOST returns null success", async () => {
      const responsePayload = { status: "SIGN_IN_UP_NOT_ALLOWED" };
      (createGoogleSignInSuccess as Mock).mockReturnValue(null);

      initSupertokens();

      const thirdPartyConfig = getFirstCallArg<{
        override: {
          apis: (originalImplementation: {
            signInUpPOST?: (input: unknown) => Promise<unknown>;
          }) => {
            signInUpPOST: (input: unknown) => Promise<unknown>;
          };
        };
      }>(ThirdParty.init);

      const originalImplementation = {
        signInUpPOST: mock().mockResolvedValue(responsePayload),
      };

      const overridden = thirdPartyConfig.override.apis(originalImplementation);

      await overridden.signInUpPOST({ some: "input" });

      expect(googleAuthService.handleGoogleAuth).not.toHaveBeenCalled();
    });

    it("delegates logout cleanup in signOutPOST", async () => {
      const userId = new ObjectId().toString();

      const originalImplementation = {
        marker: "ok" as const,
        signOutPOST: mock(function (this: { marker: string }) {
          return Promise.resolve({ res: this.marker });
        }),
      };

      (userService.handleLogoutCleanup as Mock).mockResolvedValue(undefined);

      initSupertokens();

      const sessionConfig = getFirstCallArg<{
        override: {
          apis: (original: typeof originalImplementation) => {
            signOutPOST: (input: unknown) => Promise<unknown>;
          };
        };
      }>(Session.init);

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
      expect(userService.handleLogoutCleanup).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ res: "ok" });
    });

    it("returns the sign-out response when logout cleanup fails", async () => {
      const userId = new ObjectId().toString();

      const originalImplementation = {
        signOutPOST: mock().mockResolvedValue({ res: "ok" }),
      };

      (userService.handleLogoutCleanup as Mock).mockImplementation(() =>
        Promise.reject(new Error("cleanup failed")),
      );

      initSupertokens();

      const sessionConfig = getFirstCallArg<{
        override: {
          apis: (original: typeof originalImplementation) => {
            signOutPOST: (input: unknown) => Promise<unknown>;
          };
        };
      }>(Session.init);

      const overridden = sessionConfig.override.apis(originalImplementation);

      await expect(
        overridden.signOutPOST({
          session: {
            getUserId: () => userId,
          },
        }),
      ).resolves.toEqual({ res: "ok" });
    });
  });

  describe("supertokensCors", () => {
    it("creates a cors middleware using SuperTokens CORS headers", () => {
      const corsReturn = mock();
      corsLib.default.mockReturnValue(corsReturn);

      superTokensNode.getAllCORSHeaders.mockReturnValue(["st-auth-mode"]);

      const middleware = supertokensCors();

      expect(middleware).toBe(corsReturn);
      expect(corsLib.default).toHaveBeenCalledTimes(1);

      const arg = getFirstCallArg<{
        allowedHeaders: string[];
        credentials: boolean;
        origin: string[];
      }>(corsLib.default);
      expect(arg.credentials).toBe(true);
      expect(arg.origin).toEqual(CONFIG.ORIGINS_ALLOWED);

      expect(arg.allowedHeaders).toEqual([
        "content-type",
        "st-auth-mode",
        "st-auth-mode",
      ]);
    });

    it("falls back to the configured frontend origin when allowed origins are empty", () => {
      const originalAllowedOrigins = CONFIG.ORIGINS_ALLOWED;
      const originalFrontendUrl = CONFIG.FRONTEND_URL;
      const corsReturn = mock();
      corsLib.default.mockReturnValue(corsReturn);

      CONFIG.ORIGINS_ALLOWED = [];
      CONFIG.FRONTEND_URL = "https://compass.example.com/day";

      try {
        supertokensCors();

        const arg = getFirstCallArg<{
          origin: string[];
        }>(corsLib.default);

        expect(arg.origin).toEqual(["https://compass.example.com"]);
      } finally {
        CONFIG.ORIGINS_ALLOWED = originalAllowedOrigins;
        CONFIG.FRONTEND_URL = originalFrontendUrl;
      }
    });
  });
});
