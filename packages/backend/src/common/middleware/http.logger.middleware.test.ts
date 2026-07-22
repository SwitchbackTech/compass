import { type Request, type Response } from "express";
import { httpLoggingMiddleware } from "@backend/common/middleware/http.logger.middleware";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { EventEmitter } from "node:events";

const makeRequest = (originalUrl: string): Request =>
  ({
    method: "GET",
    originalUrl,
    get ip() {
      throw new Error("request IP should not be read");
    },
  }) as unknown as Request;

const runMiddleware = (req: Request) => {
  const res = Object.assign(new EventEmitter(), {
    statusCode: 200,
  }) as unknown as Response;
  const next = mock();
  const logSpy = spyOn(console, "log").mockImplementation(() => {});

  httpLoggingMiddleware(req, res, next);
  res.emit("finish");

  return { next, logSpy };
};

describe("httpLoggingMiddleware", () => {
  const originalLogLevel = process.env["LOG_LEVEL"];

  afterEach(() => {
    process.env["LOG_LEVEL"] = originalLogLevel;
  });

  it("logs completed requests without reading the request IP address", () => {
    delete process.env["LOG_LEVEL"];

    const { next, logSpy } = runMiddleware(makeRequest("/api/event"));

    expect(next).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("GET"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("/api/event"));
  });

  it("does not log health checks at the default log level", () => {
    delete process.env["LOG_LEVEL"];

    const { next, logSpy } = runMiddleware(makeRequest("/api/health"));

    expect(next).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("logs health checks when LOG_LEVEL is debug", () => {
    process.env["LOG_LEVEL"] = "debug";

    const { logSpy } = runMiddleware(makeRequest("/api/health?foo=bar"));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("/api/health"));
  });
});
