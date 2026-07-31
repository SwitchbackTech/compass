import { faker } from "@faker-js/faker";
import {
  type ProviderCalendarId,
  type ProviderCalendarSourceId,
} from "@core/types/sync/identity.contracts";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { refreshConnectionState } from "@sync/domain/connection-state-refresh.service";
import { type JobEnqueue } from "@sync/storage/contracts/job.contracts";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { beforeEach, describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

describe("refreshConnectionState", () => {
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

  const deps = () => ({ connections, calendars, resources, credentials, jobs });

  async function seedImportingConnection() {
    const connection = await connections.upsertByProviderAccount({
      tenantId: objectId(),
      principalId: objectId(),
      provider: "google",
      account: {
        providerAccountId: "acct-1",
        email: "user@example.com",
        displayName: "User",
      },
      capabilities: ["readEvents", "readBusy", "writeEvents"],
      state: "importing",
      stateReason: null,
      lastSyncedAt: null,
      lastHealthyAt: null,
    });
    await credentials.store({
      connectionId: connection._id,
      provider: "google",
      refreshToken: "refresh",
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });
    return connection;
  }

  it("stays importing until discovery finishes", async () => {
    const connection = await seedImportingConnection();
    await resources.ensure({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      resourceKind: "calendarList",
      calendarId: null,
    });

    const after = await refreshConnectionState(deps(), connection);
    expect(after.state).toBe("importing");
  });

  it("becomes healthy once discovery and active calendar imports finish", async () => {
    const connection = await seedImportingConnection();
    const calendar = await calendars.upsertByProviderCalendar({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      providerCalendarId: "primary@example.com" as ProviderCalendarSourceId,
      displayName: "Primary",
      color: "#fff",
      active: true,
      primary: true,
      accessRole: "owner",
      capabilities: {
        canReadEvents: true,
        canWriteEvents: true,
        canReadBusy: true,
        canInviteAttendees: true,
      },
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

    const eventsResource = await resources.ensure({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      resourceKind: "events",
      calendarId: calendar._id as ProviderCalendarId,
    });
    await resources.advanceCursor(
      connection.tenantId,
      connection.principalId,
      eventsResource._id,
      "events-cursor",
      new Date(),
    );

    const after = await refreshConnectionState(deps(), connection);
    expect(after.state).toBe("healthy");
    expect(after.stateReason).toBeNull();
    expect(after.lastHealthyAt).toBeInstanceOf(Date);
    expect(after.lastSyncedAt).toBeInstanceOf(Date);
  });

  it("reports delayed/providerErrors when a job for the connection is wedged in state:failed", async () => {
    // The 2026-07-30 gap: oldestDueWorkAt was hardcoded to null here, so a job
    // that exhausted its retry ladder and terminalized as state:"failed" was
    // invisible to the connection's own health state — every signal green
    // while a calendar sat unsynced for ~25h. A failed job is unconditionally
    // overdue (see findOldestOverdueByConnection), so this must flip the
    // connection to delayed the moment one exists, independent of any
    // otherwise-healthy import evidence.
    const connection = await seedImportingConnection();
    const calendar = await calendars.upsertByProviderCalendar({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      providerCalendarId: "primary@example.com" as ProviderCalendarSourceId,
      displayName: "Primary",
      color: "#fff",
      active: true,
      primary: true,
      accessRole: "owner",
      capabilities: {
        canReadEvents: true,
        canWriteEvents: true,
        canReadBusy: true,
        canInviteAttendees: true,
      },
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
    const eventsResource = await resources.ensure({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      resourceKind: "events",
      calendarId: calendar._id as ProviderCalendarId,
    });
    await resources.advanceCursor(
      connection.tenantId,
      connection.principalId,
      eventsResource._id,
      "events-cursor",
      new Date(),
    );

    await jobs.enqueue({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      resourceId: eventsResource._id,
      commandId: null,
      kind: "incrementalPull",
      priority: 0,
      runAfter: new Date("2026-01-01T00:00:00.000Z"),
      coalescingKey: `incrementalPull:${eventsResource._id}`,
    } as JobEnqueue);
    const claimed = await jobs.claimDueJob(
      "worker",
      new Date("2026-01-01T00:00:00.000Z"),
      60_000,
    );
    await jobs.fail(claimed!._id, "worker", "retryableTransient");

    const after = await refreshConnectionState(deps(), connection);
    expect(after.state).toBe("delayed");
    expect(after.stateReason).toBe("providerErrors");
  });

  it("keeps importing when an active calendar still lacks a cursor", async () => {
    const connection = await seedImportingConnection();
    const calendar = await calendars.upsertByProviderCalendar({
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
    await resources.ensure({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      resourceKind: "events",
      calendarId: calendar._id as ProviderCalendarId,
    });

    const after = await refreshConnectionState(deps(), connection);
    expect(after.state).toBe("importing");
  });

  it("reports delayed/providerErrors when an active calendar's reads durably fail", async () => {
    const connection = await seedImportingConnection();
    const calendar = await calendars.upsertByProviderCalendar({
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
    const eventsResource = await resources.ensure({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      resourceKind: "events",
      calendarId: calendar._id as ProviderCalendarId,
    });
    // Imported successfully, THEN the provider started durably rejecting reads —
    // the case that used to leave every health signal green.
    await resources.advanceCursor(
      connection.tenantId,
      connection.principalId,
      eventsResource._id,
      "events-cursor",
      new Date(),
    );
    await resources.markReadFailure(
      connection.tenantId,
      connection.principalId,
      eventsResource._id,
      new Date(),
      "Not Found (HTTP 404, reason notFound)",
    );

    const after = await refreshConnectionState(deps(), connection);
    expect(after.state).toBe("delayed");
    expect(after.stateReason).toBe("providerErrors");
  });

  it("ignores a read-failure marker on a calendar that is no longer active", async () => {
    const connection = await seedImportingConnection();
    const calendar = await calendars.upsertByProviderCalendar({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      providerCalendarId: "retired@example.com" as ProviderCalendarSourceId,
      displayName: "Retired",
      color: null,
      active: false,
      primary: false,
      accessRole: "owner",
      capabilities: {
        canReadEvents: true,
        canWriteEvents: true,
        canReadBusy: true,
        canInviteAttendees: true,
      },
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
    const eventsResource = await resources.ensure({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      resourceKind: "events",
      calendarId: calendar._id as ProviderCalendarId,
    });
    await resources.markReadFailure(
      connection.tenantId,
      connection.principalId,
      eventsResource._id,
      new Date(),
      "Not Found (HTTP 404, reason notFound)",
    );

    // No active calendar is broken, so the connection is healthy.
    const after = await refreshConnectionState(deps(), connection);
    expect(after.state).toBe("healthy");
  });

  it("derives actionRequired/authorizationRevoked when the credential is missing", async () => {
    const connection = await seedImportingConnection();
    await credentials.deleteByConnection(connection._id);

    const after = await refreshConnectionState(deps(), connection);
    expect(after.state).toBe("actionRequired");
    expect(after.stateReason).toBe("authorizationRevoked");
  });
});
