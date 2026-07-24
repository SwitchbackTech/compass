import { faker } from "@faker-js/faker";
import { type BusyAvailabilityRequest } from "@core/types/sync/availability.contracts";
import { type EventOccurrenceListQuery } from "@core/types/sync/event.contracts";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { verifyInternalRequest } from "@sync/auth/internal-auth";
import {
  AVAILABILITY_BUSY_PATH,
  BEGIN_PATH,
  CONNECTIONS_PATH,
  EVENTS_PATH,
} from "@sync/server/connection.routes";
import {
  SyncServiceClient,
  type SyncServiceClientOptions,
} from "./sync-service.client";

const objectId = () => faker.database.mongodbObjectId();
const SECRET = "shared-internal-secret";
const NOW = 1_800_000_000_000;
const BASE_URL = "http://sync.internal:3010";

// Records the last request the client made, so a test can inspect the signed
// headers, and returns a scripted response.
interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

const fakeFetch = (
  responder: (captured: Captured) => Promise<{
    status: number;
    json: () => Promise<unknown>;
  }>,
) => {
  const calls: Captured[] = [];
  const fn: SyncServiceClientOptions["fetch"] = async (url, init) => {
    const captured: Captured = {
      url,
      method: init.method,
      headers: init.headers,
      body: init.body,
    };
    calls.push(captured);
    return responder(captured);
  };
  return { fn, calls };
};

const client = (fetchFn: SyncServiceClientOptions["fetch"]) =>
  new SyncServiceClient({
    baseUrl: BASE_URL,
    secret: SECRET,
    timeoutMs: 20,
    fetch: fetchFn,
    now: () => NOW,
    newCorrelationId: () => "corr-1",
  });

const principal = () => ({ tenantId: objectId(), principalId: objectId() });

const request = (calendarIds: string[]): BusyAvailabilityRequest => ({
  calendarIds: calendarIds as BusyAvailabilityRequest["calendarIds"],
  start: "2026-07-14T09:00:00.000Z" as BusyAvailabilityRequest["start"],
  end: "2026-07-14T17:00:00.000Z" as BusyAvailabilityRequest["end"],
  maxAgeMs: 900_000,
  purpose: "booking_confirmation",
});

const okBody = () => ({
  intervals: [
    { start: "2026-07-14T09:00:00.000Z", end: "2026-07-14T10:00:00.000Z" },
  ],
  computedAt: "2026-07-14T12:00:00.000Z",
  connections: [],
  complete: true,
  issues: [],
  bookable: true,
});

describe("SyncServiceClient", () => {
  it("signs a request the real Sync verifier accepts, and returns the parsed body", async () => {
    const who = principal();
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => okBody(),
    }));

    const result = await client(fn).queryBusyAvailability(
      who,
      request([objectId()]),
    );

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value.bookable).toBe(true);
    expect(result.value.intervals).toHaveLength(1);

    // The URL and method are correct.
    const sent = calls[0];
    expect(sent?.url).toBe(`${BASE_URL}${AVAILABILITY_BUSY_PATH}`);
    expect(sent?.method).toBe("POST");

    // The signed headers verify against the real Sync internal-auth verifier,
    // for the same principal — cross-service auth compatibility.
    const verdict = verifyInternalRequest({
      secret: SECRET,
      headers: sent?.headers ?? {},
      now: NOW,
    });
    if (!verdict.ok) throw new Error(`verify failed: ${verdict.reason}`);
    expect(verdict.context.tenantId).toBe(who.tenantId);
    expect(verdict.context.principalId).toBe(who.principalId);
  });

  it("lists connections with a signed GET the real Sync verifier accepts", async () => {
    const who = principal();
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ connections: [] }),
    }));

    const result = await client(fn).listConnections(who);

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value.connections).toEqual([]);

    const sent = calls[0];
    expect(sent?.url).toBe(`${BASE_URL}${CONNECTIONS_PATH}`);
    expect(sent?.method).toBe("GET");
    expect(sent?.body).toBeUndefined();

    const verdict = verifyInternalRequest({
      secret: SECRET,
      headers: sent?.headers ?? {},
      now: NOW,
    });
    if (!verdict.ok) throw new Error(`verify failed: ${verdict.reason}`);
    expect(verdict.context.tenantId).toBe(who.tenantId);
    expect(verdict.context.principalId).toBe(who.principalId);
  });

  it("rejects a connections body that does not match the contract", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ connections: [{ bogus: true }] }),
    }));

    const result = await client(fn).listConnections(principal());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalidResponse");
  });

  it("lists event occurrences with a signed GET the real Sync verifier accepts", async () => {
    const who = principal();
    const calendarA = objectId();
    const calendarB = objectId();
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ occurrences: [], nextCursor: null }),
    }));

    const result = await client(fn).listEventOccurrences(who, {
      calendarIds: [
        calendarA,
        calendarB,
      ] as EventOccurrenceListQuery["calendarIds"],
      start: "2026-07-14T09:00:00.000Z" as EventOccurrenceListQuery["start"],
      end: "2026-07-14T17:00:00.000Z" as EventOccurrenceListQuery["end"],
      limit: 100,
    });

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value.occurrences).toEqual([]);
    expect(result.value.nextCursor).toBeNull();

    const sent = calls[0];
    expect(sent?.method).toBe("GET");
    expect(sent?.body).toBeUndefined();
    // Path parity with the Sync route, plus repeated calendarIds params (the
    // Sync route parses them back into an array) and the range + limit.
    expect(sent?.url.startsWith(`${BASE_URL}${EVENTS_PATH}?`)).toBe(true);
    const query = new URL(sent?.url ?? "").searchParams;
    expect(query.getAll("calendarIds")).toEqual([calendarA, calendarB]);
    expect(query.get("start")).toBe("2026-07-14T09:00:00.000Z");
    expect(query.get("end")).toBe("2026-07-14T17:00:00.000Z");
    expect(query.get("limit")).toBe("100");

    const verdict = verifyInternalRequest({
      secret: SECRET,
      headers: sent?.headers ?? {},
      now: NOW,
    });
    if (!verdict.ok) throw new Error(`verify failed: ${verdict.reason}`);
    expect(verdict.context.tenantId).toBe(who.tenantId);
    expect(verdict.context.principalId).toBe(who.principalId);
  });

  it("omits the cursor param when no cursor is given", async () => {
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ occurrences: [], nextCursor: null }),
    }));

    await client(fn).listEventOccurrences(principal(), {
      calendarIds: [objectId()] as EventOccurrenceListQuery["calendarIds"],
      start: "2026-07-14T09:00:00.000Z" as EventOccurrenceListQuery["start"],
      end: "2026-07-14T17:00:00.000Z" as EventOccurrenceListQuery["end"],
    });

    const query = new URL(calls[0]?.url ?? "").searchParams;
    expect(query.has("cursor")).toBe(false);
    expect(query.has("limit")).toBe(false);
  });

  it("rejects an event-occurrence body that does not match the contract", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ occurrences: [{ bogus: true }], nextCursor: null }),
    }));

    const result = await client(fn).listEventOccurrences(principal(), {
      calendarIds: [objectId()] as EventOccurrenceListQuery["calendarIds"],
      start: "2026-07-14T09:00:00.000Z" as EventOccurrenceListQuery["start"],
      end: "2026-07-14T17:00:00.000Z" as EventOccurrenceListQuery["end"],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalidResponse");
  });

  it("begins a connection with a signed POST the real Sync verifier accepts", async () => {
    const who = principal();
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({
        authorizationUrl:
          "https://accounts.google.com/o/oauth2/v2/auth?state=x",
      }),
    }));

    const result = await client(fn).beginConnection(who);

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value.authorizationUrl).toContain("accounts.google.com");

    const sent = calls[0];
    expect(sent?.url).toBe(`${BASE_URL}${BEGIN_PATH}`);
    expect(sent?.method).toBe("POST");
    // No connectionId given: a fresh connection sends an empty body.
    expect(JSON.parse(sent?.body ?? "{}")).toEqual({});

    const verdict = verifyInternalRequest({
      secret: SECRET,
      headers: sent?.headers ?? {},
      now: NOW,
    });
    if (!verdict.ok) throw new Error(`verify failed: ${verdict.reason}`);
    expect(verdict.context.principalId).toBe(who.principalId);
  });

  it("forwards a connectionId for reconnect", async () => {
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      }),
    }));

    const connectionId = objectId();
    await client(fn).beginConnection(principal(), {
      connectionId: connectionId as ConnectionId,
    });

    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({ connectionId });
  });

  it("rejects a begin body that does not match the contract", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ authorizationUrl: "not-a-url" }),
    }));

    const result = await client(fn).beginConnection(principal());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalidResponse");
  });

  it("maps a 401 to an unauthorized error", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 401,
      json: async () => ({ error: "unauthorized" }),
    }));

    const result = await client(fn).queryBusyAvailability(
      principal(),
      request([objectId()]),
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: "unauthorized", status: 401, correlationId: "corr-1" },
    });
  });

  it("maps a 400 to a badRequest error", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 400,
      json: async () => ({ error: "invalid_query" }),
    }));

    const result = await client(fn).queryBusyAvailability(
      principal(),
      request([objectId()]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("badRequest");
  });

  it("maps a 503 to unavailable", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 503,
      json: async () => ({ error: "not_ready" }),
    }));

    const result = await client(fn).queryBusyAvailability(
      principal(),
      request([objectId()]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unavailable");
  });

  it("maps a connection failure to unavailable", async () => {
    const fn: SyncServiceClientOptions["fetch"] = async () => {
      throw new Error("ECONNREFUSED");
    };

    const result = await client(fn).queryBusyAvailability(
      principal(),
      request([objectId()]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unavailable");
  });

  it("times out a request that outlives the deadline", async () => {
    // A fetch that only settles when aborted — the client's deadline fires first.
    const fn: SyncServiceClientOptions["fetch"] = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });

    const result = await client(fn).queryBusyAvailability(
      principal(),
      request([objectId()]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("timeout");
  });

  it("rejects a 200 body that does not match the contract", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ not: "a busy response" }),
    }));

    const result = await client(fn).queryBusyAvailability(
      principal(),
      request([objectId()]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalidResponse");
  });

  it("never exposes the shared secret in the signature header or the result", async () => {
    const { fn, calls } = fakeFetch(async () => ({
      status: 401,
      json: async () => ({ error: "unauthorized" }),
    }));

    const result = await client(fn).queryBusyAvailability(
      principal(),
      request([objectId()]),
    );

    const signature = calls[0]?.headers["x-sync-signature"] ?? "";
    // The header carries an HMAC (64 hex chars), never the raw secret.
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    expect(signature).not.toContain(SECRET);
    // Nothing the caller receives contains the secret.
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });
});
