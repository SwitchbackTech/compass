import { type TokenPayload } from "google-auth-library";
import { faker } from "@faker-js/faker";
import {
  createGoogleSignInSuccess,
  resolveGoogleSessionUserId,
} from "@backend/common/middleware/supertokens.middleware.util";

describe("supertokens.middleware.util", () => {
  describe("resolveGoogleSessionUserId", () => {
    it("prefers the current session when one exists", () => {
      const sessionUserId = faker.database.mongodbObjectId();
      const recipeUserId = faker.database.mongodbObjectId();

      expect(
        resolveGoogleSessionUserId({
          sessionUserId,
          googleAuthIntent: "reconnect",
          createdNewRecipeUser: false,
          recipeUserId,
        }),
      ).toBe(sessionUserId);
    });

    it("uses the recipe user id for reconnects without a session", () => {
      const recipeUserId = faker.database.mongodbObjectId();

      expect(
        resolveGoogleSessionUserId({
          sessionUserId: null,
          googleAuthIntent: "reconnect",
          createdNewRecipeUser: false,
          recipeUserId,
        }),
      ).toBe(recipeUserId);
    });

    it("keeps normal returning users on the sign-in path without reconnect intent", () => {
      expect(
        resolveGoogleSessionUserId({
          sessionUserId: null,
          createdNewRecipeUser: false,
          recipeUserId: faker.database.mongodbObjectId(),
        }),
      ).toBeNull();
    });

    it("does not force reconnect behavior for new users", () => {
      expect(
        resolveGoogleSessionUserId({
          sessionUserId: null,
          googleAuthIntent: "reconnect",
          createdNewRecipeUser: true,
          recipeUserId: faker.database.mongodbObjectId(),
        }),
      ).toBeNull();
    });
  });

  describe("createGoogleSignInSuccess", () => {
    it("returns null for non-OK responses", () => {
      expect(
        createGoogleSignInSuccess({
          status: "SIGN_IN_UP_NOT_ALLOWED",
        } as Parameters<typeof createGoogleSignInSuccess>[0]),
      ).toBeNull();
    });

    it("embeds reconnect fallback user id into the auth success payload", () => {
      const recipeUserId = faker.database.mongodbObjectId();
      const success = createGoogleSignInSuccess(
        {
          status: "OK",
          rawUserInfoFromProvider: {
            fromIdTokenPayload: {
              sub: faker.string.uuid(),
              email: faker.internet.email(),
            } as TokenPayload,
          },
          oAuthTokens: {
            refresh_token: faker.string.uuid(),
            access_token: faker.internet.jwt(),
          },
          createdNewRecipeUser: false,
          user: {
            id: recipeUserId,
            loginMethods: [{}],
          },
        } as Parameters<typeof createGoogleSignInSuccess>[0],
        "reconnect",
        null,
      );

      expect(success).toMatchObject({
        createdNewRecipeUser: false,
        recipeUserId,
        sessionUserId: recipeUserId,
        loginMethodsLength: 1,
      });
    });
  });
});
