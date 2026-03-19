import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import { faker } from "@faker-js/faker";
import compassAuthService from "./compass.auth.service";

jest.mock("supertokens-node/recipe/session", () => ({
  __esModule: true,
  default: {
    createNewSessionWithoutRequestResponse: jest.fn(),
    revokeAllSessionsForUser: jest.fn(),
  },
}));

const createNewSessionWithoutRequestResponseMock = jest.mocked(
  Session.createNewSessionWithoutRequestResponse,
);

const revokeAllSessionsForUserMock = jest.mocked(
  Session.revokeAllSessionsForUser,
);

describe("CompassAuthService", () => {
  describe("createSessionForUser", () => {
    it("creates a session and returns the expected session payload", async () => {
      const compassUserId = faker.database.mongodbObjectId();
      const sUserId = supertokens.convertToRecipeUserId(compassUserId);

      const accessToken = faker.string.uuid();
      const sessionHandle = faker.string.uuid();

      const sessionMock = {
        getAccessToken: jest.fn().mockReturnValue(accessToken),
        getHandle: jest.fn().mockReturnValue(sessionHandle),
      };

      createNewSessionWithoutRequestResponseMock.mockResolvedValue(
        sessionMock as unknown as ReturnType<
          typeof Session.createNewSessionWithoutRequestResponse
        >,
      );

      const result =
        await compassAuthService.createSessionForUser(compassUserId);

      expect(
        Session.createNewSessionWithoutRequestResponse,
      ).toHaveBeenCalledWith("public", expect.anything());

      const [, calledRecipeUserId] =
        createNewSessionWithoutRequestResponseMock.mock.calls[0] ?? [];

      expect(calledRecipeUserId).toBeDefined();

      const getAsString = (value: unknown) =>
        (value as { getAsString: () => string }).getAsString();

      expect(getAsString(calledRecipeUserId)).toBe(getAsString(sUserId));
      expect(sessionMock.getAccessToken).toHaveBeenCalledTimes(1);
      expect(sessionMock.getHandle).toHaveBeenCalledTimes(1);
      expect(result.sessionHandle).toBe(sessionHandle);
      expect(result.compassUserId).toBe(compassUserId);
      expect(result.accessToken).toBe(accessToken);
      expect(getAsString(result.userId)).toBe(getAsString(sUserId));
    });

    it("throws a helpful error when session creation fails", async () => {
      const compassUserId = faker.database.mongodbObjectId();

      createNewSessionWithoutRequestResponseMock.mockRejectedValue(
        new Error("boom"),
      );

      await expect(
        compassAuthService.createSessionForUser(compassUserId),
      ).rejects.toThrow("Failed to create session");
    });
  });

  describe("revokeSessionsByUser", () => {
    it("returns the revoked sessions count", async () => {
      const userId = faker.database.mongodbObjectId();

      revokeAllSessionsForUserMock.mockResolvedValue([
        faker.string.uuid(),
        faker.string.uuid(),
      ]);

      const result = await compassAuthService.revokeSessionsByUser(userId);

      expect(Session.revokeAllSessionsForUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ sessionsRevoked: 2 });
    });

    it("returns 0 when no sessions are revoked", async () => {
      const userId = faker.database.mongodbObjectId();

      revokeAllSessionsForUserMock.mockResolvedValue([]);

      const result = await compassAuthService.revokeSessionsByUser(userId);

      expect(Session.revokeAllSessionsForUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ sessionsRevoked: 0 });
    });
  });
});
