import { type Server } from "node:http";

// Keep the public API and the independently deployed sync service on the same
// connection policy. Node's defaults are intentionally general purpose (for
// example, a five-minute request timeout), which is too permissive for these
// small JSON APIs and lets slow clients occupy sockets far longer than useful.
export const HTTP_SERVER_LIMITS = {
  headersTimeoutMs: 15_000,
  requestTimeoutMs: 60_000,
  keepAliveTimeoutMs: 5_000,
  maxHeadersCount: 100,
  maxRequestsPerSocket: 1_000,
} as const;

export function configureHttpServer(server: Server): Server {
  server.headersTimeout = HTTP_SERVER_LIMITS.headersTimeoutMs;
  server.requestTimeout = HTTP_SERVER_LIMITS.requestTimeoutMs;
  server.keepAliveTimeout = HTTP_SERVER_LIMITS.keepAliveTimeoutMs;
  server.maxHeadersCount = HTTP_SERVER_LIMITS.maxHeadersCount;
  server.maxRequestsPerSocket = HTTP_SERVER_LIMITS.maxRequestsPerSocket;
  return server;
}
