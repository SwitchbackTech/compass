import { GaxiosError } from "gaxios";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { handleExpressError } from "@backend/common/errors/handlers/error.express.handler";
import {
  error,
  errorHandler,
  toClientErrorPayload,
} from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { eventMutationError } from "@backend/event/event.error";
import { sseServer } from "@backend/servers/sse/sse.server";
import userService from "@backend/user/services/user.service";
import { describe, expect, it, mock, spyOn } from "bun:test";

describe("error.handler", () => {
  describe("toClientErrorPayload", () => {
    it("returns only result and message from BaseError", () => {
      const baseError = error(
        UserError.MissingGoogleRefreshToken,
        "User has not connected Google Calendar",
      );

      const payload = toClientErrorPayload(baseError);

      expect(payload).toEqual({
        result: "User has not connected Google Calendar",
        message: UserError.MissingGoogleRefreshToken.description,
      });
    });

    it("excludes stack, statusCode, and isOperational", () => {
      const baseError = new BaseError(
        "some-result",
        "some-description",
        Status.BAD_REQUEST,
        true,
      );

      const payload = toClientErrorPayload(baseError);

      expect(payload).not.toHaveProperty("stack");
      expect(payload).not.toHaveProperty("statusCode");
      expect(payload).not.toHaveProperty("isOperational");
      expect(Object.keys(payload)).toEqual(["result", "message"]);
    });

    it("includes code when the BaseError has one", () => {
      const baseError = new BaseError(
        "some-result",
        "some-description",
        Status.CONFLICT,
        true,
        "GOOGLE_ACCOUNT_ALREADY_CONNECTED",
      );

      expect(toClientErrorPayload(baseError)).toEqual({
        result: "some-result",
        message: "some-description",
        code: "GOOGLE_ACCOUNT_ALREADY_CONNECTED",
      });
    });
  });

  describe("handleExpressError", () => {
    it("returns the EventMutationError envelope for MAINTENANCE", async () => {
      const json = mock();
      const res = {
        header: mock().mockReturnThis(),
        status: mock().mockReturnThis(),
        json,
      } as unknown as Parameters<typeof handleExpressError>[1];
      const req = {} as Parameters<typeof handleExpressError>[0];

      await handleExpressError(
        req,
        res,
        eventMutationError(
          "MAINTENANCE",
          "Cloud edits are paused for maintenance",
        ),
      );

      expect(res.status).toHaveBeenCalledWith(Status.SERVICE_UNAVAILABLE);
      expect(json).toHaveBeenCalledWith({
        code: "MAINTENANCE",
        message: "Cloud edits are paused for maintenance",
        retryable: true,
      });
    });

    it("returns 401 with GOOGLE_REVOKED payload when Google token is invalid", async () => {
      const userId = "507f1f77bcf86cd799439011";
      spyOn(userService, "pruneGoogleData").mockResolvedValue();
      const handleGoogleRevokedSpy = spyOn(sseServer, "publishSyncStatus");
      handleGoogleRevokedSpy.mockImplementation(() => undefined);
      spyOn(errorHandler, "isOperational").mockReturnValue(true);

      const send = mock();
      const res = {
        header: mock().mockReturnThis(),
        status: mock().mockReturnThis(),
        send,
      } as unknown as Parameters<typeof handleExpressError>[1];
      const req = {
        session: { getUserId: () => userId },
      } as Parameters<typeof handleExpressError>[0];
      (res as { req?: typeof req }).req = req;

      await handleExpressError(req, res, invalidGrant400Error);

      expect(res.status).toHaveBeenCalledWith(Status.UNAUTHORIZED);
      expect(send).toHaveBeenCalledWith({
        code: "GOOGLE_REVOKED",
        message:
          "Google Calendar access expired or was revoked. Reconnect Google Calendar in Compass to resume syncing.",
      });
      expect(handleGoogleRevokedSpy).toHaveBeenCalledWith(userId, {
        status: "attention",
        code: "GOOGLE_REVOKED",
        retryable: false,
      });
      handleGoogleRevokedSpy.mockRestore();
    });

    it("sends a 500 fallback for a Google error matching neither known case, instead of hanging with no response", async () => {
      const userId = "507f1f77bcf86cd799439011";
      spyOn(errorHandler, "isOperational").mockReturnValue(true);

      const send = mock();
      const res = {
        header: mock().mockReturnThis(),
        status: mock().mockReturnThis(),
        send,
      } as unknown as Parameters<typeof handleExpressError>[1];
      const req = {
        session: { getUserId: () => userId },
      } as Parameters<typeof handleExpressError>[0];
      (res as { req?: typeof req }).req = req;

      const quotaError = new GaxiosError(
        "quota exceeded",
        { headers: new Headers(), url: new URL("https://example.com") },
        {
          config: {
            headers: new Headers(),
            url: new URL("https://example.com"),
          },
          data: { error: "rateLimitExceeded" },
          status: 403,
          statusText: "Forbidden",
          headers: new Headers(),
          ok: false,
          redirected: false,
          type: "error" as ResponseType,
          url: "https://example.com",
          body: null,
          bodyUsed: false,
          clone: () => {
            throw new Error("Not implemented");
          },
          arrayBuffer: async () => {
            throw new Error("Not implemented");
          },
          blob: async () => {
            throw new Error("Not implemented");
          },
          formData: async () => {
            throw new Error("Not implemented");
          },
          json: async () => ({ error: "rateLimitExceeded" }),
          text: async () => {
            throw new Error("Not implemented");
          },
          bytes: async () => {
            throw new Error("Not implemented");
          },
        },
      );
      quotaError.code = "403";

      await handleExpressError(req, res, quotaError as never);

      expect(res.status).toHaveBeenCalledWith(Status.INTERNAL_SERVER);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });
});
