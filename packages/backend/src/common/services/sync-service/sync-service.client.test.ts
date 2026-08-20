import { faker } from "@faker-js/faker";
import { decryptInternalCredential } from "@core/security/internal-credential-envelope";
import { type BusyAvailabilityRequest } from "@core/types/sync/availability.contracts";
import { type CommandSubmitRequest } from "@core/types/sync/command.contracts";
import { type EventInstanceListQuery } from "@core/types/sync/event.contracts";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import {
  verifyInternalRequest,
  verifyServiceRequest,
} from "@sync/auth/internal-auth";
import {
  CHANGES_ALL_PATH,
  CHANGES_PATH,
} from "@sync/server/change-feed.routes";
import { COMMANDS_PATH } from "@sync/server/command.routes";
import {
  ADOPT_GOOGLE_AUTHORIZATION_PATH,
  AVAILABILITY_BUSY_PATH,
  BEGIN_PATH,
  CALENDARS_PATH,
  CONNECTIONS_PATH,
  EVENTS_FULL_PATH,
  FOREGROUND_REFRESH_PATH,
} from "@sync/server/connection.routes";
import { PRINCIPAL_PATH } from "@sync/server/principal.routes";
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

  it("purges a principal with a signed DELETE the real Sync verifier accepts", async () => {
    const who = principal();
    const counts = {
      connections: 1,
      credentials: 1,
      calendars: 0,
      events: 0,
      eventOccurrences: 0,
      syncResources: 0,
      commands: 0,
      jobs: 0,
      deletionMarkers: 0,
      invalidations: 0,
    };
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => counts,
    }));

    const result = await client(fn).purgePrincipal(who);

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value).toEqual(counts);

    const sent = calls[0];
    expect(sent?.url).toBe(`${BASE_URL}${PRINCIPAL_PATH}`);
    expect(sent?.method).toBe("DELETE");
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

  it("disconnects one connection with a signed DELETE the real Sync verifier accepts", async () => {
    const who = principal();
    const connectionId = "64b7f9c2e1a2b3c4d5e6f7ff";
    // Sync answers 204 with an empty body; reading it as JSON would throw.
    const { fn, calls } = fakeFetch(async () => ({
      status: 204,
      json: async () => {
        throw new Error("204 has no body");
      },
    }));

    const result = await client(fn).disconnectConnection(who, connectionId);

    expect(result.ok).toBe(true);

    const sent = calls[0];
    expect(sent?.url).toBe(`${BASE_URL}/internal/connections/${connectionId}`);
    expect(sent?.method).toBe("DELETE");

    const verdict = verifyInternalRequest({
      secret: SECRET,
      headers: sent?.headers ?? {},
      now: NOW,
    });
    if (!verdict.ok) throw new Error(`verify failed: ${verdict.reason}`);
    // Sync scopes the disconnect to the signed principal, so a foreign
    // connection id can never be disconnected through this client.
    expect(verdict.context.principalId).toBe(who.principalId);
  });

  it("reports a disconnect of an unknown connection as notFound", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 404,
      json: async () => ({ error: "not_found" }),
    }));

    const result = await client(fn).disconnectConnection(
      principal(),
      "64b7f9c2e1a2b3c4d5e6f7ff",
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.kind).toBe("notFound");
  });

  it("maps a 409 (passive-mode refusal) to conflict", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 409,
      json: async () => ({ error: "passive_mode" }),
    }));

    const result = await client(fn).beginConnection(principal());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.kind).toBe("conflict");
  });

  it("lists calendars with a signed GET the real Sync verifier accepts", async () => {
    const who = principal();
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ calendars: [] }),
    }));

    const result = await client(fn).listCalendars(who);

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value.calendars).toEqual([]);

    const sent = calls[0];
    expect(sent?.url).toBe(`${BASE_URL}${CALENDARS_PATH}`);
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

  it("lists active-only calendars with ?activeOnly=true when the option is set", async () => {
    const who = principal();
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ calendars: [] }),
    }));

    const result = await client(fn).listCalendars(who, { activeOnly: true });

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value.calendars).toEqual([]);

    const sent = calls[0];
    expect(sent?.url).toBe(`${BASE_URL}${CALENDARS_PATH}?activeOnly=true`);
    expect(sent?.method).toBe("GET");

    // The default call, through the same client, still sends no params —
    // one call's option must not leak a query onto the next.
    await client(fn).listCalendars(who);
    expect(calls[1]?.url).toBe(`${BASE_URL}${CALENDARS_PATH}`);

    const verdict = verifyInternalRequest({
      secret: SECRET,
      headers: sent?.headers ?? {},
      now: NOW,
    });
    if (!verdict.ok) throw new Error(`verify failed: ${verdict.reason}`);
    expect(verdict.context.tenantId).toBe(who.tenantId);
    expect(verdict.context.principalId).toBe(who.principalId);
  });

  it("polls the change feed from now and with a resume cursor", async () => {
    const who = principal();
    const cursor = objectId();
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({
        kind: "ok",
        invalidations: [],
        nextCursor: cursor,
      }),
    }));

    const fromNow = await client(fn).getChanges(who, null);
    if (!fromNow.ok) throw new Error(`expected ok, got ${fromNow.error.kind}`);
    expect(fromNow.value).toEqual({
      kind: "ok",
      invalidations: [],
      nextCursor: cursor,
    });
    expect(calls[0]?.url).toBe(`${BASE_URL}${CHANGES_PATH}`);
    expect(calls[0]?.method).toBe("GET");

    const resumed = await client(fn).getChanges(who, cursor as never);
    if (!resumed.ok) throw new Error(`expected ok, got ${resumed.error.kind}`);
    expect(calls[1]?.url).toBe(
      `${BASE_URL}${CHANGES_PATH}?cursor=${encodeURIComponent(cursor)}`,
    );

    const verdict = verifyInternalRequest({
      secret: SECRET,
      headers: calls[0]?.headers ?? {},
      now: NOW,
    });
    if (!verdict.ok) throw new Error(`verify failed: ${verdict.reason}`);
  });

  it("polls the GLOBAL change feed with no principal, signed as the service", async () => {
    const cursor = objectId();
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({
        kind: "ok",
        invalidations: [
          {
            invalidation: { kind: "connection", connectionId: objectId() },
            emittedAt: "2026-07-30T00:00:00.000Z",
            tenantId: objectId(),
            principalId: objectId(),
          },
        ],
        nextCursor: cursor,
      }),
    }));

    const fromNow = await client(fn).getGlobalChanges(null);
    if (!fromNow.ok) throw new Error(`expected ok, got ${fromNow.error.kind}`);
    expect(fromNow.value.kind).toBe("ok");
    expect(calls[0]?.url).toBe(`${BASE_URL}${CHANGES_ALL_PATH}`);
    expect(calls[0]?.method).toBe("GET");

    await client(fn).getGlobalChanges(cursor as never);
    expect(calls[1]?.url).toBe(
      `${BASE_URL}${CHANGES_ALL_PATH}?cursor=${encodeURIComponent(cursor)}`,
    );

    // No tenant/principal headers at all — the real Sync service-auth
    // verifier accepts it on that basis alone.
    expect(calls[0]?.headers).not.toHaveProperty("x-sync-tenant");
    expect(calls[0]?.headers).not.toHaveProperty("x-sync-principal");
    const verdict = verifyServiceRequest({
      secret: SECRET,
      headers: calls[0]?.headers ?? {},
      now: NOW,
    });
    if (!verdict.ok) throw new Error(`verify failed: ${verdict.reason}`);

    // And the per-principal verifier must NOT accept it (missing identity).
    expect(
      verifyInternalRequest({
        secret: SECRET,
        headers: calls[0]?.headers ?? {},
        now: NOW,
      }).ok,
    ).toBe(false);
  });

  it("rejects a global-changes body that does not match the contract", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ kind: "ok", invalidations: [{ bogus: true }] }),
    }));

    const result = await client(fn).getGlobalChanges(null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalidResponse");
  });

  it("rejects a calendars body that does not match the contract", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ calendars: [{ bogus: true }] }),
    }));

    const result = await client(fn).listCalendars(principal());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalidResponse");
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

  it("lists full events with a signed GET the real Sync verifier accepts", async () => {
    const who = principal();
    const calendarA = objectId();
    const calendarB = objectId();
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ instances: [], nextCursor: null }),
    }));

    const result = await client(fn).listFullEvents(who, {
      calendarIds: [
        calendarA,
        calendarB,
      ] as EventInstanceListQuery["calendarIds"],
      start: "2026-07-14T09:00:00.000Z" as EventInstanceListQuery["start"],
      end: "2026-07-14T17:00:00.000Z" as EventInstanceListQuery["end"],
      limit: 100,
    });

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value.instances).toEqual([]);

    const sent = calls[0];
    expect(sent?.method).toBe("GET");
    expect(sent?.body).toBeUndefined();
    // Path parity with the Sync full-event route + repeated calendarIds params.
    expect(sent?.url.startsWith(`${BASE_URL}${EVENTS_FULL_PATH}?`)).toBe(true);
    const query = new URL(sent?.url ?? "").searchParams;
    expect(query.getAll("calendarIds")).toEqual([calendarA, calendarB]);
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

  it("rejects a full-event body that does not match the contract", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ instances: [{ bogus: true }], nextCursor: null }),
    }));

    const result = await client(fn).listFullEvents(principal(), {
      calendarIds: [objectId()] as EventInstanceListQuery["calendarIds"],
      start: "2026-07-14T09:00:00.000Z" as EventInstanceListQuery["start"],
      end: "2026-07-14T17:00:00.000Z" as EventInstanceListQuery["end"],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalidResponse");
  });

  it("submits a command with a signed POST the real Sync verifier accepts", async () => {
    const who = principal();
    const eventId = objectId();
    const submitRequest = {
      idempotencyKey: "client-generated-key-1",
      eventId,
      input: { kind: "move", calendarId: objectId() },
      expectedVersion: null,
    } as CommandSubmitRequest;
    // A minimal valid command envelope the Sync service would return.
    const commandBody = {
      id: objectId(),
      tenantId: who.tenantId,
      principalId: who.principalId,
      idempotencyKey: "client-generated-key-1",
      eventId,
      input: submitRequest.input,
      expectedVersion: null,
      outcome: { state: "pending" },
      attemptCount: 0,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    };
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ command: commandBody }),
    }));

    const result = await client(fn).submitCommand(who, submitRequest);

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value.command.outcome.state).toBe("pending");
    expect(result.value.command.eventId).toBe(eventId);

    const sent = calls[0];
    expect(sent?.url).toBe(`${BASE_URL}${COMMANDS_PATH}`);
    expect(sent?.method).toBe("POST");
    // The body is the request verbatim: tenant/principal are signed, never sent.
    const body = JSON.parse(sent?.body ?? "{}");
    expect(body.idempotencyKey).toBe("client-generated-key-1");
    expect(body.input.kind).toBe("move");
    expect(body).not.toHaveProperty("tenantId");
    expect(body).not.toHaveProperty("principalId");

    const verdict = verifyInternalRequest({
      secret: SECRET,
      headers: sent?.headers ?? {},
      now: NOW,
    });
    if (!verdict.ok) throw new Error(`verify failed: ${verdict.reason}`);
    expect(verdict.context.tenantId).toBe(who.tenantId);
    expect(verdict.context.principalId).toBe(who.principalId);
  });

  it("rejects a command-submit body that does not match the contract", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ command: { bogus: true } }),
    }));

    const result = await client(fn).submitCommand(principal(), {
      idempotencyKey: "client-generated-key-2",
      eventId: objectId(),
      input: { kind: "move", calendarId: objectId() },
      expectedVersion: null,
    } as CommandSubmitRequest);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalidResponse");
  });

  it("maps a 400 command rejection to badRequest without throwing", async () => {
    const { fn } = fakeFetch(async () => ({
      status: 400,
      json: async () => ({ error: "invalid_command" }),
    }));

    const result = await client(fn).submitCommand(principal(), {
      idempotencyKey: "client-generated-key-3",
      eventId: objectId(),
      input: { kind: "move", calendarId: objectId() },
      expectedVersion: null,
    } as CommandSubmitRequest);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("badRequest");
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

  it("sends foreground principals in one service-authenticated batch", async () => {
    const principalIds = [objectId(), objectId()];
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({ enqueued: 1, inFlight: 0, resources: 2 }),
    }));

    const result = await client(fn).refreshForegroundConnections(
      principalIds as never,
    );

    expect(result.ok).toBe(true);
    const sent = calls[0];
    expect(sent?.url).toBe(`${BASE_URL}${FOREGROUND_REFRESH_PATH}`);
    expect(JSON.parse(sent?.body ?? "{}")).toEqual({ principalIds });
    expect(
      verifyServiceRequest({
        secret: SECRET,
        headers: sent?.headers ?? {},
        now: NOW,
      }).ok,
    ).toBe(true);
  });

  it("adopts a server-exchanged Google authorization with a signed POST", async () => {
    const who = principal();
    const request = {
      account: {
        providerAccountId: "google-sub-1",
        email: "connected@example.com",
        displayName: "Connected User",
      },
      refreshToken: "server-exchanged-refresh-token",
      grantedScopes: ["https://www.googleapis.com/auth/calendar.events"],
    };
    const { fn, calls } = fakeFetch(async () => ({
      status: 200,
      json: async () => ({}),
    }));

    const result = await client(fn).adoptGoogleAuthorization(who, request);

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value).toEqual({});
    const sent = calls[0];
    expect(sent?.url).toBe(`${BASE_URL}${ADOPT_GOOGLE_AUTHORIZATION_PATH}`);
    expect(sent?.method).toBe("POST");
    const body = JSON.parse(sent?.body ?? "") as {
      account: unknown;
      credential: unknown;
      grantedScopes: unknown;
    };
    expect(body.account).toEqual(request.account);
    expect(body.grantedScopes).toEqual(request.grantedScopes);
    expect(JSON.stringify(body)).not.toContain(request.refreshToken);
    expect(
      decryptInternalCredential(SECRET, body.credential as never, {
        tenantId: who.tenantId,
        principalId: who.principalId,
        account: request.account,
        grantedScopes: request.grantedScopes,
      }),
    ).toBe(request.refreshToken);
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

  it("maps a 429 to unavailable, not unexpectedStatus", async () => {
    // Sync's internal rate limiter (a shared 300/min bucket) returns 429
    // under normal-ish load. Previously this fell through to
    // unexpectedStatus -> GenericError.NotSure (Status.UNSURE = 600, not a
    // real HTTP status) instead of a retryable service-busy signal.
    const { fn } = fakeFetch(async () => ({
      status: 429,
      json: async () => ({ error: "rate_limited" }),
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

  it("keeps submitCommand open longer than the default read deadline", async () => {
    // Default client timeout is 20ms; a 50ms response must still succeed for
    // commands (provider deletes run inline and routinely exceed the read
    // deadline).
    const who = principal();
    const eventId = objectId();
    const commandBody = {
      id: objectId(),
      tenantId: who.tenantId,
      principalId: who.principalId,
      idempotencyKey: "slow-delete-key",
      eventId,
      input: {
        kind: "delete",
        invitation: "none",
        scope: "all",
        recurrenceId: null,
      },
      expectedVersion: null,
      outcome: {
        state: "confirmed",
        providerEventId: null,
        providerVersion: null,
      },
      attemptCount: 1,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:01.000Z",
    };
    const fn: SyncServiceClientOptions["fetch"] = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        status: 200,
        json: async () => ({ command: commandBody }),
      };
    };

    const result = await client(fn).submitCommand(who, {
      idempotencyKey: "slow-delete-key",
      eventId,
      input: {
        kind: "delete",
        invitation: "none",
        scope: "all",
        recurrenceId: null,
      },
      expectedVersion: null,
    } as CommandSubmitRequest);

    if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}`);
    expect(result.value.command.outcome.state).toBe("confirmed");
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
