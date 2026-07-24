import { beforeEach, describe, expect, it } from "bun:test";
import { faker } from "@faker-js/faker";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { refreshConnectionState } from "@sync/domain/connection-state-refresh.service";
import {
  type ProviderCalendarId,
  type ProviderCalendarSourceId,
} from "@core/types/sync/identity.contracts";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const objectId = () => faker.database.mongodbObjectId();

describe("refreshConnectionState", () => {
  const storage = setupSyncStorage(import.meta.url);
  let connections: ProviderConnectionRepository;
  let calendars: ProviderCalendarRepository;
  let resources: SyncResourceRepository;
  let credentials: CredentialRepository;

  beforeEach(() => {
    connections = new ProviderConnectionRepository(storage.db());
    calendars = new ProviderCalendarRepository(storage.db());
    resources = new SyncResourceRepository(storage.db());
    credentials = new CredentialRepository(storage.db());
  });

  const deps = () => ({ connections, calendars, resources, credentials });

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
});
