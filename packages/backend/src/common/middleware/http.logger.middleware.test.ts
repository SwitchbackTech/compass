import { type Request, type Response } from "express";
import { restoreFileMocks } from "@backend/__tests__/helpers/mock.setup";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { EventEmitter } from "node:events";

const makeRequest = (originalUrl: string): Request =>
  ({
    method: "GET",
    originalUrl,
    get ip() {
      throw new Error("request IP should not be read");
    },
  }) as unknown as Request;

describe("httpLoggingMiddleware", () => {
  const originalLogLevel = process.env["LOG_LEVEL"];

  afterEach(() => {
    restoreFileMocks();
    process.env["LOG_LEVEL"] = originalLogLevel;
  });

  it("logs completed requests without reading the request IP address", async () => {
    delete process.env["LOG_LEVEL"];

    const { httpLoggingMiddleware } = await import("./http.logger.middleware");

    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
    }) as unknown as Response;
    const req = makeRequest("/api/event");
    const next = mock();

    httpLoggingMiddleware(req, res, next);
    res.emit("finish");

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("does not log health checks at the default log level", async () => {
    process.env["LOG_LEVEL"] = "info";

    delete require.cache[require.resolve("./http.logger.middleware")];
    const { httpLoggingMiddleware } = await import("./http.logger.middleware");

    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
    }) as unknown as Response;
    const req = makeRequest("/api/health");
    const next = mock();

    httpLoggingMiddleware(req, res, next);
    res.emit("finish");

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("logs health checks when LOG_LEVEL is debug", async () => {
    process.env["LOG_LEVEL"] = "debug";

    delete require.cache[require.resolve("./http.logger.middleware")];
    const { httpLoggingMiddleware } = await import("./http.logger.middleware");

    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
    }) as unknown as Response;
    const req = makeRequest("/api/health?foo=bar");
    const next = mock();

    httpLoggingMiddleware(req, res, next);
    res.emit("finish");

    expect(next).toHaveBeenCalledTimes(1);
  });
});
