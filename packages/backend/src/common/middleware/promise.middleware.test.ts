import { type NextFunction, type Request } from "express";
import { Status } from "@core/errors/status.codes";
import { requestMiddleware } from "@backend/common/middleware/promise.middleware";
import { type Res_Promise } from "@backend/common/types/express.types";

const flushPromises = async () => {
  await new Promise(setImmediate);
};

describe("promise.middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Res_Promise>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {};
    mockNext = jest.fn();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    requestMiddleware()(mockReq as Request, mockRes as Res_Promise, mockNext);
  });

  it("sends an empty body for NO_CONTENT status-only payloads", async () => {
    mockRes.promise(Promise.resolve({ statusCode: Status.NO_CONTENT }));

    await flushPromises();

    expect(mockRes.status).toHaveBeenCalledWith(Status.NO_CONTENT);
    expect(mockRes.send).toHaveBeenCalledWith();
  });

  it("preserves response bodies when statusCode is part of a larger payload", async () => {
    const payload = {
      statusCode: Status.OK,
      events: [],
    };

    mockRes.promise(Promise.resolve(payload));

    await flushPromises();

    expect(mockRes.status).toHaveBeenCalledWith(Status.OK);
    expect(mockRes.send).toHaveBeenCalledWith(payload);
  });
});
