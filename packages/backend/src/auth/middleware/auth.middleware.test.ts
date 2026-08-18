import { type NextFunction, type Request, type Response } from "express";
import { NodeEnv } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import authMiddleware from "@backend/auth/middleware/auth.middleware";
import { CONFIG } from "@backend/common/constants/config.constants";
import { afterEach, describe, expect, it, mock } from "bun:test";

describe("auth.middleware verifyIsDev", () => {
  const originalNodeEnv = CONFIG.NODE_ENV;

  afterEach(() => {
    CONFIG.NODE_ENV = originalNodeEnv;
  });

  const mockRes = () => {
    const json = mock();
    const res = {
      status: mock().mockReturnThis(),
      json,
    } as unknown as Response;
    return { res, json };
  };

  it("returns 403 and does not call next in production", () => {
    CONFIG.NODE_ENV = NodeEnv.Production;
    const { res, json } = mockRes();
    const next = mock() as NextFunction;

    authMiddleware.verifyIsDev({} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(Status.FORBIDDEN);
    expect(json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next in development", () => {
    CONFIG.NODE_ENV = NodeEnv.Development;
    const { res } = mockRes();
    const next = mock() as NextFunction;

    authMiddleware.verifyIsDev({} as Request, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
