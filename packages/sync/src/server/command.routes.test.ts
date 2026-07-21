import { faker } from "@faker-js/faker";
import { NodeEnv } from "@core/constants/core.constants";
import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { createSyncService, type SyncService } from "@sync/app";
import { signInternalRequest } from "@sync/auth/internal-auth";
import { type SyncConfig } from "@sync/config/sync.config";
import { COMMANDS_PATH } from "@sync/server/command.routes";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { type AddressInfo } from "node:net";

const uri = process.env["SYNC_MONGO_URI"] as string;
const objectId = () => faker.database.mongodbObjectId();
const SECRET = "internal-secret";

const testConfig = (overrides: Partial<SyncConfig> = {}): SyncConfig =>
  ({
    NODE_ENV: NodeEnv.Test,
    PORT: 0,
    MONGO_URI: uri,
    INTERNAL_AUTH_TOKEN: SECRET,
    CALLBACK_BASE_URL: "http://localhost:3010",
    EXECUTION: "passive",
    MAX_CONCURRENCY: 4,
    ...overrides,
  }) as SyncConfig;

const signedHeaders = (
  tenantId: string,
  principalId: string,
): Record<string, string> => {
  const timestamp = Date.now();
  return {
    "content-type": "application/json",
    "x-sync-tenant": tenantId,
    "x-sync-principal": principalId,
    "x-sync-timestamp": String(timestamp),
    "x-sync-signature": signInternalRequest(SECRET, {
      timestamp,
      tenantId,
      principalId,
    }),
  };
};

// A minimal, valid cloud create request. tenant/principal are NOT in the body —
// they ride on the signed headers.
const createRequest = (overrides: Record<string, unknown> = {}) => ({
  idempotencyKey: `idem-${objectId()}`,
  eventId: objectId(),
  input: {
    kind: "create",
    calendarId: objectId(),
    content: {
      title: "Lunch",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
    },
    schedule: {
      kind: "timed",
      start: "2026-07-14T12:00:00-06:00",
      end: "2026-07-14T13:00:00-06:00",
      timeZone: "America/Denver",
    },
    recurrence: { kind: "single" },
  },
  expectedVersion: null,
  ...overrides,
});

describe("POST /internal/commands", () => {
  let mongo: SyncMongoService;
  let service: SyncService;
  let base: string;

  const startService = async (config: SyncConfig = testConfig()) => {
    service = createSyncService(config, { mongo });
    await new Promise<void>((resolve) => service.httpServer.listen(0, resolve));
    const { port } = service.httpServer.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  };

  const submit = (tenantId: string, principalId: string, body: unknown) =>
    fetch(`${base}${COMMANDS_PATH}`, {
      method: "POST",
      headers: signedHeaders(tenantId, principalId),
      body: JSON.stringify(body),
    });

  beforeEach(async () => {
    mongo = new SyncMongoService();
    await mongo.connect({
      uri,
      databaseName: `cmd_api_${objectId()}`,
      forbiddenDatabaseName: "compass_api_unused",
      enforceLeastPrivilege: false,
    });
  });

  afterEach(async () => {
    await service?.stop();
    await mongo.db.dropDatabase();
    await mongo.disconnect();
  });

  it("confirms a cloud-only create and writes the canonical event", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const request = createRequest();
    // No connection/provider is seeded and the service is passive: a cloud
    // create needs neither.
    await startService();

    const res = await submit(tenantId, principalId, request);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      command: {
        outcome: { state: string; providerEventId: null };
        eventId: string;
      };
    };
    expect(body.command.outcome.state).toBe("confirmed");
    expect(body.command.outcome.providerEventId).toBeNull();

    const events = new EventRepository(mongo.db);
    const stored = await events.findById(
      tenantId as TenantId,
      principalId as PrincipalId,
      request.eventId as never,
    );
    expect(stored).not.toBeNull();
    expect(stored?.origin).toBe("compass");
    expect(stored?.connectionId).toBeNull();
    expect(stored?.confirmedAt).not.toBeNull();
    // The signed principal owns the event, not anything in the body.
    expect(stored?.principalId).toBe(principalId);
  });

  it("is idempotent on a repeated upload", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const request = createRequest();
    await startService();

    const first = (await (
      await submit(tenantId, principalId, request)
    ).json()) as { command: { id: string } };
    const second = (await (
      await submit(tenantId, principalId, request)
    ).json()) as { command: { id: string; outcome: { state: string } } };

    expect(second.command.id).toBe(first.command.id);
    expect(second.command.outcome.state).toBe("confirmed");
    expect(await mongo.db.collection("commands").countDocuments()).toBe(1);
    expect(await mongo.db.collection("events").countDocuments()).toBe(1);
  });

  it("recovers an interrupted acknowledgement by confirming on retry", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const request = createRequest();
    await startService();

    // Simulate a crash after the command persisted but before it was applied:
    // the command already exists as pending with no event written.
    const commands = new CommandRepository(mongo.db);
    const pending = await commands.submit({
      tenantId: tenantId as TenantId,
      principalId: principalId as PrincipalId,
      idempotencyKey: request.idempotencyKey as never,
      eventId: request.eventId as never,
      input: request.input as never,
      expectedVersion: null,
    });
    expect(pending.outcome.state).toBe("pending");

    const res = await submit(tenantId, principalId, request);

    const body = (await res.json()) as {
      command: { id: string; outcome: { state: string } };
    };
    expect(body.command.id).toBe(pending._id);
    expect(body.command.outcome.state).toBe("confirmed");
    const events = new EventRepository(mongo.db);
    expect(
      await events.findById(
        tenantId as TenantId,
        principalId as PrincipalId,
        request.eventId as never,
      ),
    ).not.toBeNull();
  });

  it("maps a series create to a stored series master", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const request = createRequest({
      input: {
        ...createRequest().input,
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
      },
    });
    await startService();

    await submit(tenantId, principalId, request);

    const events = new EventRepository(mongo.db);
    const stored = await events.findById(
      tenantId as TenantId,
      principalId as PrincipalId,
      request.eventId as never,
    );
    expect(stored?.recurrence).toEqual({
      kind: "seriesMaster",
      rules: ["RRULE:FREQ=WEEKLY"],
    });
  });

  it("persists a non-create command as durable pending intent", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const request = createRequest({
      input: {
        kind: "delete",
        scope: "this",
      },
    });
    await startService();

    const res = await submit(tenantId, principalId, request);

    const body = (await res.json()) as {
      command: { outcome: { state: string } };
    };
    expect(body.command.outcome.state).toBe("pending");
    // No event is written for a command that was only recorded, not applied.
    expect(await mongo.db.collection("events").countDocuments()).toBe(0);
    expect(await mongo.db.collection("commands").countDocuments()).toBe(1);
  });

  it("promotes an anonymous device event, preserving its clientEventId", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const clientEventId = `device-${objectId()}`;
    const request = createRequest({
      input: { ...createRequest().input, clientEventId },
    });
    await startService();

    const res = await submit(tenantId, principalId, request);

    expect(res.status).toBe(200);
    const events = new EventRepository(mongo.db);
    const stored = await events.findById(
      tenantId as TenantId,
      principalId as PrincipalId,
      request.eventId as never,
    );
    expect(stored?.clientEventId).toBe(clientEventId);
  });

  it("converges a resumed promotion to one cloud event via the stable id", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const clientEventId = `device-${objectId()}`;
    const eventId = objectId();
    const input = { ...createRequest().input, clientEventId };
    await startService();

    // A resumed promotion is a fresh attempt (new idempotency key) for the same
    // device event. Two separate commands result, but the stable event id keeps
    // them converging on exactly one cloud event.
    await submit(tenantId, principalId, {
      idempotencyKey: `idem-${objectId()}`,
      eventId,
      input,
      expectedVersion: null,
    });
    await submit(tenantId, principalId, {
      idempotencyKey: `idem-${objectId()}`,
      eventId,
      input,
      expectedVersion: null,
    });

    expect(await mongo.db.collection("commands").countDocuments()).toBe(2);
    expect(await mongo.db.collection("events").countDocuments()).toBe(1);
    const events = new EventRepository(mongo.db);
    const stored = await events.findById(
      tenantId as TenantId,
      principalId as PrincipalId,
      eventId as never,
    );
    expect(stored?.clientEventId).toBe(clientEventId);
  });

  it("refuses to overwrite another principal's event with a reused id", async () => {
    const tenantId = objectId();
    const owner = objectId();
    const attacker = objectId();
    const request = createRequest();
    await startService();

    // The owner creates an event.
    await submit(tenantId, owner, request);

    // A different principal submits a create reusing the owner's event id.
    const res = await submit(tenantId, attacker, {
      ...request,
      idempotencyKey: `idem-${objectId()}`,
    });

    // The write is refused (the scoped filter collides on the unique _id),
    // never a silent clobber.
    expect(res.status).toBe(500);
    const events = new EventRepository(mongo.db);
    const stored = await events.findById(
      tenantId as TenantId,
      owner as PrincipalId,
      request.eventId as never,
    );
    // The owner still owns the untouched event.
    expect(stored?.principalId).toBe(owner);
  });

  it("rejects a malformed command body", async () => {
    await startService();

    const res = await submit(objectId(), objectId(), { not: "a command" });

    expect(res.status).toBe(400);
  });

  it("rejects a create carrying an expectedVersion", async () => {
    await startService();
    const request = createRequest({ expectedVersion: "v1" });

    const res = await submit(objectId(), objectId(), request);

    expect(res.status).toBe(400);
  });

  it("rejects an unsigned request", async () => {
    await startService();

    const res = await fetch(`${base}${COMMANDS_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(createRequest()),
    });

    expect(res.status).toBe(401);
  });
});
