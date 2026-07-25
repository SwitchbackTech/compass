import { Status } from "@core/errors/status.codes";
import { CONFIG } from "@backend/common/constants/config.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import authController from "./auth.controller";
import { afterEach, describe, expect, it, mock } from "bun:test";

describe("auth.controller", () => {
  describe("connectGoogle", () => {
    const originalMutationMode = CONFIG.SYNC_CLOUD_MUTATION_MODE;

    afterEach(() => {
      CONFIG.SYNC_CLOUD_MUTATION_MODE = originalMutationMode;
    });

    it("rejects Google connect with typed MAINTENANCE during cutover", () => {
      CONFIG.SYNC_CLOUD_MUTATION_MODE = "maintenance";
      const status = mock().mockReturnThis();
      const json = mock();
      const promise = mock();

      authController.connectGoogle(
        {
          body: {},
          session: { getUserId: () => "507f1f77bcf86cd799439011" },
        } as never,
        { status, json, promise } as never,
      );

      expect(promise).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(Status.SERVICE_UNAVAILABLE);
      expect(json).toHaveBeenCalledWith({
        code: "MAINTENANCE",
        message: "Cloud edits are paused for maintenance",
        retryable: true,
      });
    });

    it("rejects Google connect when Google is not configured", async () => {
      const originalClientId = CONFIG.GOOGLE_CLIENT_ID;
      const originalClientSecret = CONFIG.GOOGLE_CLIENT_SECRET;
      CONFIG.GOOGLE_CLIENT_ID = undefined;
      CONFIG.GOOGLE_CLIENT_SECRET = undefined;
      const promise = mock();

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
      const promise = mock();

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

  describe("beginGoogleConnection", () => {
    const originalMutationMode = CONFIG.SYNC_CLOUD_MUTATION_MODE;

    afterEach(() => {
      CONFIG.SYNC_CLOUD_MUTATION_MODE = originalMutationMode;
    });

    it("rejects connect begin with typed MAINTENANCE during cutover", () => {
      CONFIG.SYNC_CLOUD_MUTATION_MODE = "maintenance";
      const status = mock().mockReturnThis();
      const json = mock();
      const promise = mock();

      authController.beginGoogleConnection(
        {
          body: {},
          session: { getUserId: () => "507f1f77bcf86cd799439011" },
        } as never,
        { status, json, promise } as never,
      );

      expect(promise).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(Status.SERVICE_UNAVAILABLE);
      expect(json).toHaveBeenCalledWith({
        code: "MAINTENANCE",
        message: "Cloud edits are paused for maintenance",
        retryable: true,
      });
    });
  });
});
