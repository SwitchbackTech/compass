import { GOOGLE_REVOKED } from "@core/constants/websocket.constants";
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
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import userService from "@backend/user/services/user.service";

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

  describe("handleExpressError", () => {
    it("returns 401 with GOOGLE_REVOKED payload when Google token is invalid", async () => {
      const userId = "507f1f77bcf86cd799439011";
      jest.spyOn(userService, "pruneGoogleData").mockResolvedValue();
      const handleGoogleRevokedSpy = jest.spyOn(
        webSocketServer,
        "handleGoogleRevoked",
      );
      handleGoogleRevokedSpy.mockImplementation(() => undefined);
      jest.spyOn(errorHandler, "isOperational").mockReturnValue(true);

      const send = jest.fn();
      const res = {
        header: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        send,
      } as unknown as Parameters<typeof handleExpressError>[1];
      const req = {
        session: { getUserId: () => userId },
      } as Parameters<typeof handleExpressError>[0];
      (res as { req?: typeof req }).req = req;

      await handleExpressError(req, res, invalidGrant400Error);

      expect(res.status).toHaveBeenCalledWith(Status.UNAUTHORIZED);
      expect(send).toHaveBeenCalledWith({
        code: GOOGLE_REVOKED,
        message: "Google access revoked. Your Google data has been removed.",
      });
      expect(handleGoogleRevokedSpy).toHaveBeenCalledWith(userId);
      handleGoogleRevokedSpy.mockRestore();
    });
  });
});
