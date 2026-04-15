import { faker } from "@faker-js/faker";
import { type TokenPayload } from "google-auth-library";
import { createUserIdMapping, getUserIdMapping } from "supertokens-node";
import {
  buildResetPasswordLink,
  createGoogleSignInSuccess,
  ensureExternalUserIdMapping,
  getFormFieldValue,
  maybeReplaceEmailPasswordSession,
} from "@backend/common/middleware/supertokens.middleware.util";

jest.mock("supertokens-node", () => ({
  createUserIdMapping: jest.fn(),
  getUserIdMapping: jest.fn(),
}));

describe("supertokens.middleware.util", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("ensureExternalUserIdMapping", () => {
    it("returns the existing external user id mapping", async () => {
      const recipeUserId = faker.database.mongodbObjectId();
      const externalUserId = faker.database.mongodbObjectId();

      jest.mocked(getUserIdMapping).mockResolvedValue({
        status: "OK",
        externalUserId,
        superTokensUserId: recipeUserId,
      } as Awaited<ReturnType<typeof getUserIdMapping>>);

      await expect(ensureExternalUserIdMapping(recipeUserId)).resolves.toBe(
        externalUserId,
      );
      expect(createUserIdMapping).not.toHaveBeenCalled();
    });

    it("creates a new external user id mapping when one does not exist", async () => {
      const recipeUserId = faker.database.mongodbObjectId();

      jest.mocked(getUserIdMapping).mockResolvedValue({
        status: "UNKNOWN_MAPPING_ERROR",
      } as Awaited<ReturnType<typeof getUserIdMapping>>);
      jest
        .mocked(createUserIdMapping)
        .mockResolvedValue({ status: "OK" } as Awaited<
          ReturnType<typeof createUserIdMapping>
        >);

      const externalUserId = await ensureExternalUserIdMapping(recipeUserId);

      expect(createUserIdMapping).toHaveBeenCalledWith({
        superTokensUserId: recipeUserId,
        externalUserId,
      });
      expect(externalUserId).toMatch(/^[a-f0-9]{24}$/);
    });
  });

  describe("getFormFieldValue", () => {
    it("returns the string value for the matching field", () => {
      const email = faker.internet.email();
      const name = faker.person.fullName();

      expect(
        getFormFieldValue(
          [
            { id: "email", value: email },
            { id: "name", value: name },
          ],
          "name",
        ),
      ).toBe(name);
    });

    it("returns undefined for missing or non-string fields", () => {
      expect(
        getFormFieldValue(
          [
            { id: "email", value: faker.internet.email() },
            { id: "name", value: 123 },
          ],
          "name",
        ),
      ).toBeUndefined();

      expect(getFormFieldValue([], "name")).toBeUndefined();
    });
  });

  describe("buildResetPasswordLink", () => {
    it("rewrites reset links into the app auth flow", () => {
      const token = faker.string.alphanumeric(32);
      const frontendUrl = "http://localhost:9080";

      expect(
        buildResetPasswordLink(
          `http://localhost:3567/auth/reset-password?token=${token}`,
          frontendUrl,
        ),
      ).toBe(`http://localhost:9080/day?auth=reset&token=${token}`);
    });

    it("returns the original link when the token is missing", () => {
      const passwordResetLink =
        "http://localhost:3567/auth/reset-password?foo=bar";

      expect(
        buildResetPasswordLink(passwordResetLink, "http://localhost:9080"),
      ).toBe(passwordResetLink);
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

  describe("maybeReplaceEmailPasswordSession", () => {
    it("returns the original response when the session already belongs to the canonical Compass user", async () => {
      const input = {
        formFields: [],
        options: { req: {}, res: {} },
      } as unknown as Parameters<typeof maybeReplaceEmailPasswordSession>[0];
      const response = {
        status: "OK" as const,
        session: {
          getHandle: () => "existing-session",
          getUserId: () => "compass-user-id",
        },
      } as Parameters<typeof maybeReplaceEmailPasswordSession>[1];
      const replaceSession = jest.fn();

      const result = await maybeReplaceEmailPasswordSession(
        input,
        response,
        "compass-user-id",
        replaceSession,
      );

      expect(result).toBe(response);
      expect(replaceSession).not.toHaveBeenCalled();
    });

    it("replaces the response session when SuperTokens returned a different user id", async () => {
      const input = {
        formFields: [],
        options: { req: {}, res: {} },
      } as unknown as Parameters<typeof maybeReplaceEmailPasswordSession>[0];
      const existingSession = {
        getHandle: () => "existing-session",
        getUserId: () => "recipe-user-id",
      };
      const replacementSession = {
        getHandle: () => "compass-session",
        getUserId: () => "compass-user-id",
      };
      const response = {
        status: "OK" as const,
        session: existingSession,
      } as Parameters<typeof maybeReplaceEmailPasswordSession>[1];
      const replaceSession = jest.fn().mockResolvedValue(replacementSession);

      const result = await maybeReplaceEmailPasswordSession(
        input,
        response,
        "compass-user-id",
        replaceSession,
      );

      expect(replaceSession).toHaveBeenCalledWith(
        input,
        existingSession,
        "compass-user-id",
      );
      expect(result).toEqual({
        status: "OK",
        session: replacementSession,
      });
    });
  });
});
