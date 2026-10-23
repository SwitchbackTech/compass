import { faker } from "@faker-js/faker";
import {
  type PrincipalId,
  type ProviderAccountId,
  type ProviderCalendarSourceId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { seedOauthCredential } from "@sync/__tests__/helpers/credential-encryption";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { BOOTSTRAP_STALLED_AFTER_MS } from "@sync/domain/connection-state";
import {
  CONNECTION_STATE_REFRESH_STALE_AFTER_MS,
  refreshStaleConnectionStates,
} from "@sync/domain/connection-state-refresh.sweep";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { beforeEach, describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

describe("refreshStaleConnectionStates", () => {
  const storage = setupSyncStorage(import.meta.url);
  let connections: ProviderConnectionRepository;
  let calendars: ProviderCalendarRepository;
  let resources: SyncResourceRepository;
  let credentials: CredentialRepository;
  let jobs: JobRepository;

  beforeEach(() => {
    connections = new ProviderConnectionRepository(storage.db());
    calendars = new ProviderCalendarRepository(storage.db());
    resources = new SyncResourceRepository(storage.db());
    credentials = new CredentialRepository(storage.db());
    jobs = new JobRepository(storage.db());
  });

  const deps = () => ({
    connections,
    calendars,
    resources,
    credentials,
    jobs,
  });

  async function stampUpdatedAt(connectionId: string, at: Date) {
    await storage
      .db()
      .collection(SYNC_COLLECTIONS.providerConnections)
      .updateOne({ _id: connectionId }, { $set: { updatedAt: at } });
  }

  it("re-derives actionRequired when a stale importing row has no credential", async () => {
    const connection = await connections.upsertByProviderAccount({
      tenantId: objectId() as TenantId,
      principalId: objectId() as PrincipalId,
      provider: "google",
      account: {
        providerAccountId: "acct-stale" as ProviderAccountId,
        email: null,
        displayName: null,
      },
      capabilities: ["readEvents"],
      state: "importing",
      stateReason: null,
    });
    const staleAt = new Date(
      Date.now() - CONNECTION_STATE_REFRESH_STALE_AFTER_MS - 60_000,
    );
    await stampUpdatedAt(connection._id, staleAt);

    const result = await refreshStaleConnectionStates(deps(), {
      before: new Date(Date.now() - CONNECTION_STATE_REFRESH_STALE_AFTER_MS),
      limit: 10,
    });

    expect(result.scanned).toBe(1);
    expect(result.changed).toBe(1);
    const after = await connections.findById(
      connection.tenantId,
      connection.principalId,
      connection._id,
    );
    expect(after?.state).toBe("actionRequired");
    expect(after?.stateReason).toBe("authorizationRevoked");
  });

  it("prefers importing rows before other stale states", async () => {
    const importing = await connections.upsertByProviderAccount({
      tenantId: objectId() as TenantId,
      principalId: objectId() as PrincipalId,
      provider: "google",
      account: {
        providerAccountId: "acct-importing" as ProviderAccountId,
        email: null,
        displayName: null,
      },
      capabilities: ["readEvents"],
      state: "importing",
      stateReason: null,
    });
    const actionRequired = await connections.upsertByProviderAccount({
      tenantId: objectId() as TenantId,
      principalId: objectId() as PrincipalId,
      provider: "google",
      account: {
        providerAccountId: "acct-dead" as ProviderAccountId,
        email: null,
        displayName: null,
      },
      capabilities: ["readEvents"],
      state: "actionRequired",
      stateReason: "authorizationRevoked",
    });
    const staleAt = new Date(
      Date.now() - CONNECTION_STATE_REFRESH_STALE_AFTER_MS - 60_000,
    );
    await stampUpdatedAt(importing._id, staleAt);
    await stampUpdatedAt(actionRequired._id, staleAt);

    const result = await refreshStaleConnectionStates(deps(), {
      before: new Date(Date.now() - CONNECTION_STATE_REFRESH_STALE_AFTER_MS),
      limit: 1,
    });

    expect(result.scanned).toBe(1);
    const touched = await connections.findById(
      importing.tenantId,
      importing.principalId,
      importing._id,
    );
    expect(touched?.updatedAt.getTime()).toBeGreaterThan(staleAt.getTime());
  });

  it("moves a bootstrap-stale importing connection to delayed", async () => {
    const connection = await connections.upsertByProviderAccount({
      tenantId: objectId() as TenantId,
      principalId: objectId() as PrincipalId,
      provider: "google",
      account: {
        providerAccountId: "acct-bootstrap" as ProviderAccountId,
        email: null,
        displayName: null,
      },
      capabilities: ["readEvents"],
      state: "importing",
      stateReason: null,
    });
    await seedOauthCredential(credentials, {
      connectionId: connection._id,
      provider: "google",
      refreshToken: "refresh",
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });
    await calendars.upsertByProviderCalendar({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      providerCalendarId: "primary@example.com" as ProviderCalendarSourceId,
      displayName: "Primary",
      color: null,
      active: true,
      primary: true,
      accessRole: "owner",
      capabilities: {
        canReadEvents: true,
        canWriteEvents: true,
        canReadBusy: true,
        canInviteAttendees: true,
      },
      eventLabels: [],
      createsGoogleMeet: true,
    });
    const listResource = await resources.ensure({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      resourceKind: "calendarList",
      calendarId: null,
    });
    await resources.advanceCursor(
      connection.tenantId,
      connection.principalId,
      listResource._id,
      "list-cursor",
      new Date(),
    );

    const sweepNow = () => new Date("2026-08-01T12:00:00.000Z");
    const before = new Date(
      sweepNow().getTime() - CONNECTION_STATE_REFRESH_STALE_AFTER_MS,
    );
    const calendarStaleAt = new Date(
      sweepNow().getTime() - BOOTSTRAP_STALLED_AFTER_MS - 60_000,
    );
    await stampUpdatedAt(connection._id, new Date(before.getTime() - 60_000));
    await storage
      .db()
      .collection(SYNC_COLLECTIONS.providerCalendars)
      .updateMany(
        { connectionId: connection._id },
        { $set: { updatedAt: calendarStaleAt } },
      );

    const result = await refreshStaleConnectionStates(deps(), {
      before,
      limit: 5,
      now: sweepNow,
    });

    expect(result.changed).toBe(1);
    const after = await connections.findById(
      connection.tenantId,
      connection.principalId,
      connection._id,
    );
    expect(after?.state).toBe("delayed");
    expect(after?.stateReason).toBe("workOverdue");
  });
});
