import { CONFIG } from "@backend/common/constants/config.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import authController from "./auth.controller";

jest.mock("@backend/auth/services/google/google.auth.service", () => ({
  __esModule: true,
  googleAuthService: {
    connectGoogleToCurrentUser: jest.fn(),
  },
}));

describe("auth.controller", () => {
  describe("connectGoogle", () => {
    it("rejects Google connect when Google is not configured", async () => {
      const originalClientId = CONFIG.GOOGLE_CLIENT_ID;
      const originalClientSecret = CONFIG.GOOGLE_CLIENT_SECRET;
      CONFIG.GOOGLE_CLIENT_ID = undefined;
      CONFIG.GOOGLE_CLIENT_SECRET = undefined;
      const promise = jest.fn();

      try {
        authController.connectGoogle(
          {
            body: {},
            session: { getUserId: () => "507f1f77bcf86cd799439011" },
          } as never,
          { promise } as never,
        );
      } finally {
        CONFIG.GOOGLE_CLIENT_ID = originalClientId;
        CONFIG.GOOGLE_CLIENT_SECRET = originalClientSecret;
      }

      expect(promise).toHaveBeenCalledTimes(1);
      await expect(promise.mock.calls[0][0]).rejects.toMatchObject({
        code: AuthError.GoogleNotConfigured.code,
        description: AuthError.GoogleNotConfigured.description,
      });
    });

    it("rejects Google connect when credentials are absent", async () => {
      const originalClientId = CONFIG.GOOGLE_CLIENT_ID;
      const originalClientSecret = CONFIG.GOOGLE_CLIENT_SECRET;
      CONFIG.GOOGLE_CLIENT_ID = undefined;
      CONFIG.GOOGLE_CLIENT_SECRET = undefined;
      const promise = jest.fn();

      try {
        authController.connectGoogle(
          {
            body: {},
            session: { getUserId: () => "507f1f77bcf86cd799439011" },
          } as never,
          { promise } as never,
        );
      } finally {
        CONFIG.GOOGLE_CLIENT_ID = originalClientId;
        CONFIG.GOOGLE_CLIENT_SECRET = originalClientSecret;
      }

      expect(promise).toHaveBeenCalledTimes(1);
      await expect(promise.mock.calls[0][0]).rejects.toMatchObject({
        code: AuthError.GoogleNotConfigured.code,
        description: AuthError.GoogleNotConfigured.description,
      });
    });
  });
});
