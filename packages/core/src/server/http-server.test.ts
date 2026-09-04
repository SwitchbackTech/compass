import {
  configureHttpServer,
  HTTP_SERVER_LIMITS,
} from "@core/server/http-server";
import { describe, expect, it } from "bun:test";
import { createServer } from "node:http";

describe("configureHttpServer", () => {
  it("applies bounded, keep-alive-friendly limits", () => {
    const server = configureHttpServer(createServer());

    expect(server.headersTimeout).toBe(HTTP_SERVER_LIMITS.headersTimeoutMs);
    expect(server.requestTimeout).toBe(HTTP_SERVER_LIMITS.requestTimeoutMs);
    expect(server.keepAliveTimeout).toBe(HTTP_SERVER_LIMITS.keepAliveTimeoutMs);
    expect(server.maxHeadersCount).toBe(HTTP_SERVER_LIMITS.maxHeadersCount);
    expect(server.maxRequestsPerSocket).toBe(
      HTTP_SERVER_LIMITS.maxRequestsPerSocket,
    );
  });
});
