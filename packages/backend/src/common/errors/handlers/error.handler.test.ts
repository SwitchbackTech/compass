import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import {
  error,
  toClientErrorPayload,
} from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";

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
  });
});
