import { type z } from "zod/v4";
import {
  type BusyAvailabilityRequest,
  type BusyAvailabilityResponse,
  BusyAvailabilityResponseSchema,
} from "@core/types/sync/availability.contracts";
import {
  type ConnectionListResponse,
  ConnectionListResponseSchema,
} from "@core/types/sync/connection.contracts";
import { createHmac, randomUUID } from "node:crypto";

// The internal endpoints this client calls. Kept in sync with the Sync service's
// route paths; a contract test asserts they match.
const AVAILABILITY_BUSY_PATH = "/internal/availability/busy";
const CONNECTIONS_PATH = "/internal/connections";

const DEFAULT_TIMEOUT_MS = 5000;

// The identity a request acts on behalf of. Signed into the request so the Sync
// service derives ownership from the signature, never the body.
export interface SyncPrincipal {
  tenantId: string;
  principalId: string;
}

export type SyncClientErrorKind =
  // The Sync service rejected our signature or identity (401).
  | "unauthorized"
  // The Sync service rejected the request shape (400) — a client/contract bug.
  | "badRequest"
  // The service is unreachable or not ready (network failure or 503).
  | "unavailable"
  // The request exceeded the deadline.
  | "timeout"
  // A 2xx body that did not match the expected contract.
  | "invalidResponse"
  // Any other, unexpected status.
  | "unexpectedStatus";

// Carries no response body, secret, or identity — only what a caller needs to
// react and correlate. Safe to log.
export interface SyncClientError {
  kind: SyncClientErrorKind;
  status?: number;
  correlationId: string;
}

export type SyncClientResult<T> =
  | { ok: true; value: T; correlationId: string }
  | { ok: false; error: SyncClientError };

type FetchFn = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{ status: number; json: () => Promise<unknown> }>;

export interface SyncServiceClientOptions {
  // Base URL of the Sync service (no trailing slash), e.g. http://localhost:3010.
  baseUrl: string;
  // The shared internal-auth secret. Never logged or returned to callers.
  secret: string;
  // Per-request deadline; a slow/hung service fails as `timeout` not a hang.
  timeoutMs?: number;
  // Injectable seams for tests.
  fetch?: FetchFn;
  now?: () => number;
  newCorrelationId?: () => string;
}

// Sign a request the way the Sync service verifies it: an HMAC-SHA256 over
// `timestamp.tenantId.principalId` with the shared secret. Reimplemented here
// (rather than importing the Sync package) so the backend does not build-depend
// on the independently-deployable Sync service; a contract test proves the
// signature this produces is accepted by the real verifier.
function signRequest(
  secret: string,
  timestamp: number,
  principal: SyncPrincipal,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${principal.tenantId}.${principal.principalId}`)
    .digest("hex");
}

// A typed, authenticated client for the Compass Sync service's internal API. It
// signs each request, bounds it with a timeout, and maps every outcome to a
// typed result — the caller never sees a thrown network error, a raw status, or
// an unvalidated body.
export class SyncServiceClient {
  readonly #baseUrl: string;
  readonly #secret: string;
  readonly #timeoutMs: number;
  readonly #fetch: FetchFn;
  readonly #now: () => number;
  readonly #newCorrelationId: () => string;

  constructor(options: SyncServiceClientOptions) {
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#secret = options.secret;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#fetch = options.fetch ?? (globalThis.fetch as unknown as FetchFn);
    this.#now = options.now ?? Date.now;
    this.#newCorrelationId = options.newCorrelationId ?? randomUUID;
  }

  // The caller's provider connections, scoped to the signed principal. A read;
  // served in the Sync service's passive mode too, so it is safe to call before
  // any provider work has run.
  listConnections(
    principal: SyncPrincipal,
    correlationId?: string,
  ): Promise<SyncClientResult<ConnectionListResponse>> {
    return this.#request({
      method: "GET",
      path: CONNECTIONS_PATH,
      principal,
      schema: ConnectionListResponseSchema,
      correlationId,
    });
  }

  // Merged busy intervals plus freshness/bookability evidence for a set of
  // blocking calendars.
  queryBusyAvailability(
    principal: SyncPrincipal,
    request: BusyAvailabilityRequest,
    correlationId?: string,
  ): Promise<SyncClientResult<BusyAvailabilityResponse>> {
    return this.#request({
      method: "POST",
      path: AVAILABILITY_BUSY_PATH,
      principal,
      body: request,
      schema: BusyAvailabilityResponseSchema,
      correlationId,
    });
  }

  async #request<T>(input: {
    method: "GET" | "POST";
    path: string;
    principal: SyncPrincipal;
    body?: unknown;
    schema: z.ZodType<T>;
    correlationId?: string;
  }): Promise<SyncClientResult<T>> {
    const correlationId = input.correlationId ?? this.#newCorrelationId();
    const timestamp = this.#now();
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-sync-tenant": input.principal.tenantId,
      "x-sync-principal": input.principal.principalId,
      "x-sync-timestamp": String(timestamp),
      "x-sync-signature": signRequest(this.#secret, timestamp, input.principal),
      "x-correlation-id": correlationId,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    let response: { status: number; json: () => Promise<unknown> };
    try {
      response = await this.#fetch(`${this.#baseUrl}${input.path}`, {
        method: input.method,
        headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: controller.signal,
      });
    } catch (error) {
      // An abort is our deadline firing; anything else is a connection failure.
      const kind =
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "unavailable";
      return { ok: false, error: { kind, correlationId } };
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 200) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return errorResult("invalidResponse", correlationId, 200);
      }
      const parsed = input.schema.safeParse(body);
      if (!parsed.success) {
        return errorResult("invalidResponse", correlationId, 200);
      }
      return { ok: true, value: parsed.data, correlationId };
    }

    return errorResult(
      statusToKind(response.status),
      correlationId,
      response.status,
    );
  }
}

function statusToKind(status: number): SyncClientErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 400) return "badRequest";
  if (status === 503) return "unavailable";
  return "unexpectedStatus";
}

function errorResult<T>(
  kind: SyncClientErrorKind,
  correlationId: string,
  status?: number,
): SyncClientResult<T> {
  return { ok: false, error: { kind, status, correlationId } };
}
