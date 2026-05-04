import {
  SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER,
  SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER,
} from "@core/constants/core.constants";
import { ENV } from "@backend/common/constants/env.constants";
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
      const originalClientId = ENV.GOOGLE_CLIENT_ID;
      const originalClientSecret = ENV.GOOGLE_CLIENT_SECRET;
      ENV.GOOGLE_CLIENT_ID = undefined;
      ENV.GOOGLE_CLIENT_SECRET = undefined;
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
        ENV.GOOGLE_CLIENT_ID = originalClientId;
        ENV.GOOGLE_CLIENT_SECRET = originalClientSecret;
      }

      expect(promise).toHaveBeenCalledTimes(1);
      await expect(promise.mock.calls[0][0]).rejects.toMatchObject({
        code: AuthError.GoogleNotConfigured.code,
        description: AuthError.GoogleNotConfigured.description,
      });
    });

    it("rejects Google connect when self-host placeholder credentials are configured", async () => {
      const originalClientId = ENV.GOOGLE_CLIENT_ID;
      const originalClientSecret = ENV.GOOGLE_CLIENT_SECRET;
      ENV.GOOGLE_CLIENT_ID = SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER;
      ENV.GOOGLE_CLIENT_SECRET = SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER;
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
        ENV.GOOGLE_CLIENT_ID = originalClientId;
        ENV.GOOGLE_CLIENT_SECRET = originalClientSecret;
      }

      expect(promise).toHaveBeenCalledTimes(1);
      await expect(promise.mock.calls[0][0]).rejects.toMatchObject({
        code: AuthError.GoogleNotConfigured.code,
        description: AuthError.GoogleNotConfigured.description,
      });
    });
  });
});
