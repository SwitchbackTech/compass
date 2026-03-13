import { type Credentials, type TokenPayload } from "google-auth-library";
import { faker } from "@faker-js/faker";
import {
  type GoogleAuthDecision,
  type GoogleSignInSuccess,
  type GoogleSignInSuccessAuthService,
  handleGoogleAuth,
} from "@backend/auth/services/google/google.auth.success.service";

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

function createMockAuthService(): GoogleSignInSuccessAuthService & {
  determineGoogleAuthMode: jest.Mock;
  repairGoogleConnection: jest.Mock;
  googleSignup: jest.Mock;
  googleSignin: jest.Mock;
} {
  const defaultDecision: GoogleAuthDecision = {
    authMode: "signin_incremental",
    cUserId: faker.database.mongodbObjectId(),
    hasStoredRefreshTokenBefore: true,
    hasSession: false,
    isReconnectRepair: false,
  };

  return {
    determineGoogleAuthMode: jest.fn().mockResolvedValue(defaultDecision),
    repairGoogleConnection: jest
      .fn()
      .mockResolvedValue({ cUserId: "reconnect-id" }),
    googleSignup: jest.fn().mockResolvedValue({ cUserId: "signup-id" }),
    googleSignin: jest.fn().mockResolvedValue({ cUserId: "signin-id" }),
  };
}

describe("handleGoogleSignInSuccess", () => {
  describe("reconnect path", () => {
    it("calls repairGoogleConnection when auth mode is reconnect_repair", async () => {
      const authService = createMockAuthService();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();
      const sessionUserId = faker.database.mongodbObjectId();
      authService.determineGoogleAuthMode.mockResolvedValue({
        authMode: "reconnect_repair",
        cUserId: sessionUserId,
        hasStoredRefreshTokenBefore: false,
        hasSession: true,
        isReconnectRepair: true,
      });

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: sessionUserId,
        loginMethodsLength: 1,
        sessionUserId,
      };

      await handleGoogleAuth(success, authService);

      expect(authService.determineGoogleAuthMode).toHaveBeenCalledWith(success);
      expect(authService.repairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(authService.repairGoogleConnection).toHaveBeenCalledWith(
        sessionUserId,
        providerUser,
        oAuthTokens,
      );
      expect(authService.googleSignup).not.toHaveBeenCalled();
      expect(authService.googleSignin).not.toHaveBeenCalled();
    });
  });

  describe("sign up path", () => {
    it("calls googleSignup when new user with single login method", async () => {
      const authService = createMockAuthService();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();
      const recipeUserId = faker.database.mongodbObjectId();
      authService.determineGoogleAuthMode.mockResolvedValue({
        authMode: "signup",
        cUserId: recipeUserId,
        hasStoredRefreshTokenBefore: false,
        hasSession: false,
        isReconnectRepair: false,
      });

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: true,
        recipeUserId,
        loginMethodsLength: 1,
        sessionUserId: null,
      };

      await handleGoogleAuth(success, authService);

      expect(authService.googleSignup).toHaveBeenCalledTimes(1);
      expect(authService.googleSignup).toHaveBeenCalledWith(
        providerUser,
        oAuthTokens.refresh_token,
        recipeUserId,
      );
      expect(authService.repairGoogleConnection).not.toHaveBeenCalled();
      expect(authService.googleSignin).not.toHaveBeenCalled();
    });

    it("throws when refresh_token is missing for new user", async () => {
      const authService = createMockAuthService();
      authService.determineGoogleAuthMode.mockResolvedValue({
        authMode: "signup",
        cUserId: faker.database.mongodbObjectId(),
        hasStoredRefreshTokenBefore: false,
        hasSession: false,
        isReconnectRepair: false,
      });
      const success: GoogleSignInSuccess = {
        providerUser: makeProviderUser(),
        oAuthTokens: { access_token: faker.internet.jwt() },
        createdNewRecipeUser: true,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 1,
        sessionUserId: null,
      };

      await expect(handleGoogleAuth(success, authService)).rejects.toThrow(
        "Refresh token expected for new user sign-up",
      );

      expect(authService.googleSignup).not.toHaveBeenCalled();
    });
  });

  describe("sign in path", () => {
    it("calls googleSignin when returning user", async () => {
      const authService = createMockAuthService();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();
      authService.determineGoogleAuthMode.mockResolvedValue({
        authMode: "signin_incremental",
        cUserId: faker.database.mongodbObjectId(),
        hasStoredRefreshTokenBefore: true,
        hasSession: false,
        isReconnectRepair: false,
      });

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 1,
        sessionUserId: null,
      };

      await handleGoogleAuth(success, authService);

      expect(authService.googleSignin).toHaveBeenCalledTimes(1);
      expect(authService.googleSignin).toHaveBeenCalledWith(
        providerUser,
        oAuthTokens,
      );
      expect(authService.repairGoogleConnection).not.toHaveBeenCalled();
      expect(authService.googleSignup).not.toHaveBeenCalled();
    });

    it("calls googleSignin when createdNewRecipeUser is true but loginMethodsLength > 1", async () => {
      const authService = createMockAuthService();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();
      authService.determineGoogleAuthMode.mockResolvedValue({
        authMode: "signin_incremental",
        cUserId: faker.database.mongodbObjectId(),
        hasStoredRefreshTokenBefore: true,
        hasSession: false,
        isReconnectRepair: false,
      });

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: true,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 2,
        sessionUserId: null,
      };

      await handleGoogleAuth(success, authService);

      expect(authService.googleSignin).toHaveBeenCalledTimes(1);
      expect(authService.googleSignup).not.toHaveBeenCalled();
    });
  });
});
