import { type Request, type Response } from "express";
import { EventEmitter } from "node:events";

const { httpLoggingMiddleware } = jest.requireActual<
  typeof import("@backend/common/middleware/http.logger.middleware")
>("@backend/common/middleware/http.logger.middleware");

describe("httpLoggingMiddleware", () => {
  it("logs completed requests without reading the request IP address", () => {
    const req = {
      method: "GET",
      originalUrl: "/api/health",
      get ip() {
        throw new Error("request IP should not be read");
      },
    } as unknown as Request;
    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
    }) as unknown as Response;
    const next = jest.fn();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    try {
      httpLoggingMiddleware(req, res, next);
      res.emit("finish");

      expect(next).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("GET"));
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/health"),
      );
    } finally {
      logSpy.mockRestore();
    }
  });
});
