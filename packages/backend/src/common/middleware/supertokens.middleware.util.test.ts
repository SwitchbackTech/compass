import { type TokenPayload } from "google-auth-library";
import { faker } from "@faker-js/faker";
import { createGoogleSignInSuccess } from "@backend/common/middleware/supertokens.middleware.util";

describe("supertokens.middleware.util", () => {
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
      const success = createGoogleSignInSuccess({
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
      } as Parameters<typeof createGoogleSignInSuccess>[0]);

      expect(success).toMatchObject({
        createdNewRecipeUser: false,
        recipeUserId,
        loginMethodsLength: 1,
      });
    });
  });
});
