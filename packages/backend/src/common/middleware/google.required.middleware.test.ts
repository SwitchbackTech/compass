import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { UserError } from "@backend/common/errors/user/user.errors";
import { requireGoogleConnection } from "@backend/common/guards/google.guard";
import {
  requireGoogleConnectionFrom,
  requireGoogleConnectionSession,
} from "@backend/common/middleware/google.required.middleware";

jest.mock("@backend/common/guards/google.guard", () => ({
  requireGoogleConnection: jest.fn(),
}));

const mockRequireGoogleConnection =
  requireGoogleConnection as jest.MockedFunction<
    typeof requireGoogleConnection
  >;

describe("google.required.middleware", () => {
  let mockReq: Partial<Request & { session?: { getUserId: () => string } }>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("requireGoogleConnectionSession", () => {
    it("calls next when user has Google connected", async () => {
      const userId = new ObjectId().toString();
      mockReq = {
        session: { getUserId: () => userId },
      };
      mockRequireGoogleConnection.mockResolvedValue(undefined);

      await requireGoogleConnectionSession(
        mockReq as Parameters<typeof requireGoogleConnectionSession>[0],
        mockRes as Response,
        mockNext,
      );

      expect(mockRequireGoogleConnection).toHaveBeenCalledWith(userId);
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

      expect(mockRequireGoogleConnection).not.toHaveBeenCalled();
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
      mockRequireGoogleConnection.mockRejectedValue(baseError);

      await requireGoogleConnectionSession(
        mockReq as Parameters<typeof requireGoogleConnectionSession>[0],
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(Status.BAD_REQUEST);
      expect(mockRes.send).toHaveBeenCalledWith(baseError);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("calls next with error when non-BaseError is thrown", async () => {
      const userId = new ObjectId().toString();
      mockReq = {
        session: { getUserId: () => userId },
      };
      const unexpectedError = new Error("Database connection failed");
      mockRequireGoogleConnection.mockRejectedValue(unexpectedError);

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
      mockRequireGoogleConnection.mockResolvedValue(undefined);

      const middleware = requireGoogleConnectionFrom("userId");
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRequireGoogleConnection).toHaveBeenCalledWith(userId);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("responds with 400 when param userId is missing", async () => {
      mockReq = {
        params: {},
      };

      const middleware = requireGoogleConnectionFrom("userId");
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRequireGoogleConnection).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(
        UserError.MissingUserIdField.status,
      );
      expect(mockRes.json).toHaveBeenCalledWith(UserError.MissingUserIdField);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
