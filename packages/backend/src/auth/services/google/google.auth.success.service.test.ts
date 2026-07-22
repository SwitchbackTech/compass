import { afterAll, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { faker } from "@faker-js/faker";
import { type Credentials, type TokenPayload } from "google-auth-library";
import {
  type AuthDecision,
  type GoogleSignInSuccess,
} from "@backend/auth/services/google/google.auth.types";
import * as googleAuthUtil from "@backend/auth/services/google/util/google.auth.util";

let googleAuthService: Awaited<
  typeof import("@backend/auth/services/google/google.auth.service")
>["googleAuthService"];

function makeProviderUser(overrides?: Partial<TokenPayload>): TokenPayload {
  return {
    sub: faker.string.uuid(),
    email: faker.internet.email(),
    email_verified: true,
    ...overrides,
  } as TokenPayload;
}

function makeOAuthTokens(): Pick<
  Credentials,
  "refresh_token" | "access_token"
> {
  return {
    refresh_token: faker.string.uuid(),
    access_token: faker.internet.jwt(),
  };
}

function makeDecision(overrides: Partial<AuthDecision>): AuthDecision {
  return {
    authMode: "SIGNUP",
    compassUserId: null,
    hasStoredRefreshToken: false,
    hasHealthySync: false,
    createdNewRecipeUser: true,
    ...overrides,
  };
}

describe("handleGoogleAuth", () => {
  let mockDetermineGoogleAuthMode: Mock<
    typeof googleAuthUtil.determineGoogleAuthMode
  >;

  beforeAll(async () => {
    mockDetermineGoogleAuthMode = spyOn(
      googleAuthUtil,
      "determineGoogleAuthMode",
    );
    ({ googleAuthService } = await import(
      "@backend/auth/services/google/google.auth.service"
    ));
    spyOn(googleAuthService, "repairGoogleConnection").mockResolvedValue({
      cUserId: "repair-id",
    });
    spyOn(googleAuthService, "googleSignup").mockResolvedValue({
      cUserId: "signup-id",
    });
    spyOn(googleAuthService, "googleSignin").mockResolvedValue({
      cUserId: "signin-id",
    });
  });

  beforeEach(() => {
    mockDetermineGoogleAuthMode.mockReset();
    (googleAuthService.repairGoogleConnection as Mock).mockClear();
    (googleAuthService.googleSignup as Mock).mockClear();
    (googleAuthService.googleSignin as Mock).mockClear();
  });

  afterAll(() => {
    mock.restore();
  });

  describe("signup path", () => {
    it("calls googleSignup when no existing Compass user found", async () => {
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();
      const recipeUserId = faker.database.mongodbObjectId();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({ authMode: "SIGNUP" }),
      );

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: true,
        recipeUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(googleAuthService.googleSignup).toHaveBeenCalledTimes(1);
      expect(googleAuthService.googleSignup).toHaveBeenCalledWith(
        providerUser,
        oAuthTokens.refresh_token,
        recipeUserId,
      );
      expect(googleAuthService.repairGoogleConnection).not.toHaveBeenCalled();
      expect(googleAuthService.googleSignin).not.toHaveBeenCalled();
    });

    it("throws when refresh_token is missing for new user", async () => {
      const success: GoogleSignInSuccess = {
        providerUser: makeProviderUser(),
        oAuthTokens: { access_token: faker.internet.jwt() },
        createdNewRecipeUser: true,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 1,
      };

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({ authMode: "SIGNUP" }),
      );

      await expect(googleAuthService.handleGoogleAuth(success)).rejects.toThrow(
        "Refresh token expected for new user sign-up",
      );

      expect(googleAuthService.googleSignup).not.toHaveBeenCalled();
    });
  });

  describe("RECONNECT_REPAIR path", () => {
    it("calls repairGoogleConnection when user exists but refresh token is missing", async () => {
      const compassUserId = faker.database.mongodbObjectId();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({
          authMode: "RECONNECT_REPAIR",
          compassUserId,
          hasStoredRefreshToken: false,
          hasHealthySync: true,
          createdNewRecipeUser: false,
        }),
      );

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: compassUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(googleAuthService.repairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(googleAuthService.repairGoogleConnection).toHaveBeenCalledWith(
        compassUserId,
        providerUser,
        oAuthTokens,
      );
      expect(googleAuthService.googleSignup).not.toHaveBeenCalled();
      expect(googleAuthService.googleSignin).not.toHaveBeenCalled();
    });

    it("calls repairGoogleConnection when user exists but sync is unhealthy", async () => {
      const compassUserId = faker.database.mongodbObjectId();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({
          authMode: "RECONNECT_REPAIR",
          compassUserId,
          hasStoredRefreshToken: true,
          hasHealthySync: false,
          createdNewRecipeUser: false,
        }),
      );

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: compassUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(googleAuthService.repairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(googleAuthService.repairGoogleConnection).toHaveBeenCalledWith(
        compassUserId,
        providerUser,
        oAuthTokens,
      );
      expect(googleAuthService.googleSignup).not.toHaveBeenCalled();
      expect(googleAuthService.googleSignin).not.toHaveBeenCalled();
    });

    it("calls repairGoogleConnection when both refresh token is missing and sync is unhealthy", async () => {
      const compassUserId = faker.database.mongodbObjectId();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({
          authMode: "RECONNECT_REPAIR",
          compassUserId,
          hasStoredRefreshToken: false,
          hasHealthySync: false,
          createdNewRecipeUser: false,
        }),
      );

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: compassUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(googleAuthService.repairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(googleAuthService.googleSignup).not.toHaveBeenCalled();
      expect(googleAuthService.googleSignin).not.toHaveBeenCalled();
    });

    it("calls repairGoogleConnection when no sync record exists", async () => {
      const compassUserId = faker.database.mongodbObjectId();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({
          authMode: "RECONNECT_REPAIR",
          compassUserId,
          hasStoredRefreshToken: true,
          hasHealthySync: false,
          createdNewRecipeUser: false,
        }),
      );

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: compassUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(googleAuthService.repairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(googleAuthService.googleSignup).not.toHaveBeenCalled();
      expect(googleAuthService.googleSignin).not.toHaveBeenCalled();
    });
  });

  describe("SIGNIN_INCREMENTAL path", () => {
    it("calls googleSignin when user exists with valid refresh token and healthy sync", async () => {
      const compassUserId = faker.database.mongodbObjectId();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({
          authMode: "SIGNIN_INCREMENTAL",
          compassUserId,
          hasStoredRefreshToken: true,
          hasHealthySync: true,
          createdNewRecipeUser: false,
        }),
      );

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: compassUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(googleAuthService.googleSignin).toHaveBeenCalledTimes(1);
      expect(googleAuthService.googleSignin).toHaveBeenCalledWith(providerUser, oAuthTokens);
      expect(googleAuthService.repairGoogleConnection).not.toHaveBeenCalled();
      expect(googleAuthService.googleSignup).not.toHaveBeenCalled();
    });
  });

  describe("auth decision logging", () => {
    it("determines correct auth mode for each scenario", async () => {
      mockDetermineGoogleAuthMode.mockResolvedValueOnce(
        makeDecision({ authMode: "SIGNUP" }),
      );
      await googleAuthService.handleGoogleAuth({
        providerUser: makeProviderUser(),
        oAuthTokens: makeOAuthTokens(),
        createdNewRecipeUser: true,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 1,
      });
      expect(googleAuthService.googleSignup).toHaveBeenCalled();

      const reconnectUserId = faker.database.mongodbObjectId();
      mockDetermineGoogleAuthMode.mockResolvedValueOnce(
        makeDecision({
          authMode: "RECONNECT_REPAIR",
          compassUserId: reconnectUserId,
          hasStoredRefreshToken: false,
          hasHealthySync: true,
          createdNewRecipeUser: false,
        }),
      );
      await googleAuthService.handleGoogleAuth({
        providerUser: makeProviderUser(),
        oAuthTokens: makeOAuthTokens(),
        createdNewRecipeUser: false,
        recipeUserId: reconnectUserId,
        loginMethodsLength: 1,
      });
      expect(googleAuthService.repairGoogleConnection).toHaveBeenCalled();

      const signinUserId = faker.database.mongodbObjectId();
      mockDetermineGoogleAuthMode.mockResolvedValueOnce(
        makeDecision({
          authMode: "SIGNIN_INCREMENTAL",
          compassUserId: signinUserId,
          hasStoredRefreshToken: true,
          hasHealthySync: true,
          createdNewRecipeUser: false,
        }),
      );
      await googleAuthService.handleGoogleAuth({
        providerUser: makeProviderUser(),
        oAuthTokens: makeOAuthTokens(),
        createdNewRecipeUser: false,
        recipeUserId: signinUserId,
        loginMethodsLength: 1,
      });
      expect(googleAuthService.googleSignin).toHaveBeenCalled();
    });
  });
});
