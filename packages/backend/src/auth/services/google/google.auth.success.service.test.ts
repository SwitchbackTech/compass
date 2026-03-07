import { type Credentials, type TokenPayload } from "google-auth-library";
import { faker } from "@faker-js/faker";
import {
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
  reconnectGoogleForSession: jest.Mock;
  googleSignup: jest.Mock;
  googleSignin: jest.Mock;
} {
  return {
    reconnectGoogleForSession: jest
      .fn()
      .mockResolvedValue({ cUserId: "reconnect-id" }),
    googleSignup: jest.fn().mockResolvedValue({ cUserId: "signup-id" }),
    googleSignin: jest.fn().mockResolvedValue({ cUserId: "signin-id" }),
  };
}

describe("handleGoogleSignInSuccess", () => {
  describe("reconnect path", () => {
    it("calls reconnectGoogleForSession when sessionUserId is set", async () => {
      const authService = createMockAuthService();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();
      const sessionUserId = faker.database.mongodbObjectId();

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: sessionUserId,
        loginMethodsLength: 1,
        sessionUserId,
      };

      await handleGoogleAuth(success, authService);

      expect(authService.reconnectGoogleForSession).toHaveBeenCalledTimes(1);
      expect(authService.reconnectGoogleForSession).toHaveBeenCalledWith(
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
      expect(authService.reconnectGoogleForSession).not.toHaveBeenCalled();
      expect(authService.googleSignin).not.toHaveBeenCalled();
    });

    it("throws when refresh_token is missing for new user", async () => {
      const authService = createMockAuthService();
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
      expect(authService.reconnectGoogleForSession).not.toHaveBeenCalled();
      expect(authService.googleSignup).not.toHaveBeenCalled();
    });

    it("calls googleSignin when createdNewRecipeUser is true but loginMethodsLength > 1", async () => {
      const authService = createMockAuthService();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

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
