import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { handleExpressError } from "@backend/common/errors/handlers/error.express.handler";
import {
  error,
  toClientErrorPayload,
} from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { eventMutationError } from "@backend/event/event.error";
import { describe, expect, it, mock } from "bun:test";

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
  });
});
