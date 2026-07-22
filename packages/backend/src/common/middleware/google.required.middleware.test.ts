import { type Request, type Response } from "express";
import { ObjectId } from "mongodb";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { UserError } from "@backend/common/errors/user/user.errors";
import * as googleGuard from "@backend/common/guards/google.guard";
import {
  requireGoogleConnectionFrom,
  requireGoogleConnectionSession,
} from "@backend/common/middleware/google.required.middleware";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

describe("google.required.middleware", () => {
  let mockReq: Partial<Request & { session?: { getUserId: () => string } }>;
  let mockRes: Partial<Response>;
  let mockNext: Mock;

  beforeEach(() => {
    mockNext = mock();
    mockRes = {
      status: mock().mockReturnThis(),
      send: mock().mockReturnThis(),
      json: mock().mockReturnThis(),
    };
  });

  describe("requireGoogleConnectionSession", () => {
    it("calls next when user has Google connected", async () => {
      const userId = new ObjectId().toString();
      mockReq = {
        session: { getUserId: () => userId },
      };
      spyOn(googleGuard, "requireGoogleConnection").mockResolvedValue(undefined);

      await requireGoogleConnectionSession(
        mockReq as Parameters<typeof requireGoogleConnectionSession>[0],
        mockRes as Response,
        mockNext,
      );

      expect(googleGuard.requireGoogleConnection).toHaveBeenCalledWith(userId);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("responds with 400 when userId is missing", async () => {
      mockReq = { session: undefined };

      await requireGoogleConnectionSession(
        mockReq as Parameters<typeof requireGoogleConnectionSession>[0],
        mockRes as Response,
        mockNext,
      );

      expect(googleGuard.requireGoogleConnection).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(
        UserError.MissingUserIdField.status,
      );
      expect(mockRes.json).toHaveBeenCalledWith(UserError.MissingUserIdField);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("responds with BaseError statusCode when requireGoogleConnection throws", async () => {
      const userId = new ObjectId().toString();
      mockReq = {
        session: { getUserId: () => userId },
      };
      const baseError = new BaseError(
        "User has not connected Google Calendar",
        UserError.MissingGoogleRefreshToken.description,
        Status.BAD_REQUEST,
        true,
      );
      spyOn(googleGuard, "requireGoogleConnection").mockImplementation(() =>
        Promise.reject(baseError),
      );

      await requireGoogleConnectionSession(
        mockReq as Parameters<typeof requireGoogleConnectionSession>[0],
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(Status.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        result: baseError.result,
        message: baseError.description,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("calls next with error when non-BaseError is thrown", async () => {
      const userId = new ObjectId().toString();
      mockReq = {
        session: { getUserId: () => userId },
      };
      const unexpectedError = new Error("Database connection failed");
      spyOn(googleGuard, "requireGoogleConnection").mockImplementation(() =>
        Promise.reject(unexpectedError),
      );

      await requireGoogleConnectionSession(
        mockReq as Parameters<typeof requireGoogleConnectionSession>[0],
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("requireGoogleConnectionFrom", () => {
    it("calls next when user has Google connected", async () => {
      const userId = new ObjectId().toString();
      mockReq = {
        params: { userId },
      };
      spyOn(googleGuard, "requireGoogleConnection").mockResolvedValue(undefined);

      const middleware = requireGoogleConnectionFrom("userId");
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(googleGuard.requireGoogleConnection).toHaveBeenCalledWith(userId);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("responds with 400 when param userId is missing", async () => {
      mockReq = {
        params: {},
      };

      const middleware = requireGoogleConnectionFrom("userId");
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(googleGuard.requireGoogleConnection).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(
        UserError.MissingUserIdField.status,
      );
      expect(mockRes.json).toHaveBeenCalledWith(UserError.MissingUserIdField);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
