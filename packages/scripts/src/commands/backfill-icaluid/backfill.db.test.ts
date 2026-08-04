import {
  type BackfillDeps,
  backfillIcalUid,
  type GoogleIcalUidItem,
} from "@scripts/commands/backfill-icaluid/backfill";
import { ObjectId } from "mongodb";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type ProviderConnectionRecord } from "@sync/storage/contracts/provider-connection.contracts";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { beforeEach, describe, expect, it } from "bun:test";

const objectId = () => new ObjectId().toHexString();

describe("backfillIcalUid", () => {
  const storage = setupSyncStorage(import.meta.url);
  let connections: ProviderConnectionRepository;
  let calendars: ProviderCalendarRepository;

  beforeEach(() => {
    connections = new ProviderConnectionRepository(storage.db());
    calendars = new ProviderCalendarRepository(storage.db());
  });

  async function seedConnection(): Promise<ProviderConnectionRecord> {
    return connections.upsertByProviderAccount({
      tenantId: objectId(),
      principalId: objectId(),
      provider: "google",
      account: {
        providerAccountId: objectId(),
        email: "user@example.com",
        displayName: "User",
      },
      capabilities: ["readEvents", "readBusy", "writeEvents"],
      state: "healthy",
      stateReason: null,
      lastSyncedAt: null,
      lastHealthyAt: null,
    });
  }

  async function seedCalendar(
    connection: ProviderConnectionRecord,
  ): Promise<ProviderCalendarRecord> {
    return calendars.upsertByProviderCalendar({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      providerCalendarId: "user@example.com",
      displayName: "Primary",
      color: null,
      eventLabels: [],
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
  }

  // Raw insert mirroring a stored event: provider-owned, its
  // providerMetadata set as given (null is the common pre-MA1 case).
  async function seedEvent(
    connection: ProviderConnectionRecord,
    calendar: ProviderCalendarRecord,
    providerEventId: string,
    providerMetadata: Record<string, string> | null = null,
  ): Promise<string> {
    const _id = objectId();
    await storage
      .db()
      .collection(SYNC_COLLECTIONS.events)
      .insertOne({
        _id,
        tenantId: connection.tenantId,
        principalId: connection.principalId,
        origin: "provider",
        calendarId: calendar._id,
        clientEventId: null,
        connectionId: connection._id,
        providerEventId,
        providerVersion: "etag-1",
        providerUpdatedAt: new Date("2024-01-01T00:00:00Z"),
        deliveryState: null,
        providerMetadata,
        content: {
          title: "Standup",
          description: "",
          location: null,
          organizer: null,
          attendees: [],
          conference: null,
        },
        schedule: {
          kind: "timed",
          start: "2026-08-20T15:00:00+00:00",
          end: "2026-08-20T15:30:00+00:00",
          timeZone: "UTC",
        },
        recurrence: { kind: "single" },
        lifecycleState: "active",
        generation: 0,
        createdAt: new Date("2026-07-25T00:00:00Z"),
        updatedAt: new Date("2026-07-25T00:00:00Z"),
        confirmedAt: null,
      });
    return _id;
  }

  function depsWithPages(
    pages: GoogleIcalUidItem[][],
    options: { failConnectionIds?: string[] } = {},
  ): BackfillDeps {
    let call = 0;
    return {
      getAccessToken: (connectionId) => {
        if (options.failConnectionIds?.includes(connectionId)) {
          return Promise.reject(
            new ProviderAuthError("missingRefreshToken", "no credential"),
          );
        }
        return Promise.resolve("token");
      },
      listIcalUidPage: () => {
        const items = pages[call] ?? [];
        call += 1;
        return Promise.resolve({
          items,
          nextPageToken: call < pages.length ? `page-${call}` : null,
        });
      },
    };
  }

  const findEvent = async (id: string) =>
    (await storage
      .db()
      .collection(SYNC_COLLECTIONS.events)
      .findOne({ _id: id })) as unknown as EventRecord;

  it("sets iCalUID on a row whose providerMetadata is null, across pages", async () => {
    // null is the field's common value (the default when there is nothing
    // else to record) - the dotted-path trap this backfill exists to avoid.
    const connection = await seedConnection();
    const calendar = await seedCalendar(connection);
    const eventId = await seedEvent(connection, calendar, "ev-1", null);

    const report = await backfillIcalUid(
      storage.db(),
      depsWithPages([[{ id: "ev-1", iCalUID: "shared@google.com" }]]),
      { dryRun: false },
    );

    expect(report.reportedByGoogle).toBe(1);
    expect(report.updated).toBe(1);
    expect((await findEvent(eventId)).providerMetadata).toEqual({
      iCalUID: "shared@google.com",
    });
  });

  it("merges into existing providerMetadata rather than overwriting it", async () => {
    const connection = await seedConnection();
    const calendar = await seedCalendar(connection);
    const eventId = await seedEvent(connection, calendar, "ev-1", {
      transparency: "transparent",
    });

    await backfillIcalUid(
      storage.db(),
      depsWithPages([[{ id: "ev-1", iCalUID: "shared@google.com" }]]),
      { dryRun: false },
    );

    expect((await findEvent(eventId)).providerMetadata).toEqual({
      transparency: "transparent",
      iCalUID: "shared@google.com",
    });
  });

  it("never touches an event that already carries the key", async () => {
    const connection = await seedConnection();
    const calendar = await seedCalendar(connection);
    const eventId = await seedEvent(connection, calendar, "ev-1", {
      iCalUID: "already-set@google.com",
    });

    const report = await backfillIcalUid(
      storage.db(),
      depsWithPages([[{ id: "ev-1", iCalUID: "different@google.com" }]]),
      { dryRun: false },
    );

    expect(report.matchedMissingIcalUid).toBe(0);
    expect(report.updated).toBe(0);
    expect((await findEvent(eventId)).providerMetadata).toEqual({
      iCalUID: "already-set@google.com",
    });
  });

  it("writes nothing for events Google reports no iCalUID for", async () => {
    const connection = await seedConnection();
    const calendar = await seedCalendar(connection);
    const eventId = await seedEvent(connection, calendar, "ev-1", null);

    const report = await backfillIcalUid(
      storage.db(),
      depsWithPages([[{ id: "ev-1" }]]),
      { dryRun: false },
    );

    expect(report.googleEventsSeen).toBe(1);
    expect(report.reportedByGoogle).toBe(0);
    expect(report.updated).toBe(0);
    expect((await findEvent(eventId)).providerMetadata).toBeNull();
  });

  it("dry-run reports matches without persisting; rerun after apply is a no-op", async () => {
    const connection = await seedConnection();
    const calendar = await seedCalendar(connection);
    const eventId = await seedEvent(connection, calendar, "ev-1", null);
    const pages = () =>
      depsWithPages([[{ id: "ev-1", iCalUID: "shared@google.com" }]]);

    const dry = await backfillIcalUid(storage.db(), pages(), {
      dryRun: true,
    });
    expect(dry.matchedMissingIcalUid).toBe(1);
    expect(dry.updated).toBe(0);
    expect(dry.samples).toEqual([
      {
        connectionId: connection._id,
        calendarId: calendar._id,
        providerEventId: "ev-1",
        icalUid: "shared@google.com",
      },
    ]);
    expect((await findEvent(eventId)).providerMetadata).toBeNull();

    const applied = await backfillIcalUid(storage.db(), pages(), {
      dryRun: false,
    });
    expect(applied.updated).toBe(1);
    expect((await findEvent(eventId)).providerMetadata).toEqual({
      iCalUID: "shared@google.com",
    });

    const rerun = await backfillIcalUid(storage.db(), pages(), {
      dryRun: false,
    });
    expect(rerun.matchedMissingIcalUid).toBe(0);
    expect(rerun.updated).toBe(0);
  });

  it("skips a credential-less connection and still processes the rest", async () => {
    const doomed = await seedConnection();
    await seedCalendar(doomed);
    const healthy = await seedConnection();
    const healthyCalendar = await seedCalendar(healthy);
    const eventId = await seedEvent(healthy, healthyCalendar, "ev-1", null);

    const report = await backfillIcalUid(
      storage.db(),
      depsWithPages([[{ id: "ev-1", iCalUID: "shared@google.com" }]], {
        failConnectionIds: [doomed._id],
      }),
      { dryRun: false },
    );

    expect(report.connections).toBe(2);
    expect(report.connectionsSkipped).toBe(1);
    expect(report.updated).toBe(1);
    expect((await findEvent(eventId)).providerMetadata).toEqual({
      iCalUID: "shared@google.com",
    });
  });

  it("scopes to one connection when --connection is given", async () => {
    const target = await seedConnection();
    const targetCalendar = await seedCalendar(target);
    const targetEventId = await seedEvent(target, targetCalendar, "ev-1", null);
    const other = await seedConnection();
    const otherCalendar = await seedCalendar(other);
    const otherEventId = await seedEvent(other, otherCalendar, "ev-1", null);

    const report = await backfillIcalUid(
      storage.db(),
      depsWithPages([[{ id: "ev-1", iCalUID: "shared@google.com" }]]),
      { dryRun: false, connectionId: target._id },
    );

    expect(report.connections).toBe(1);
    expect(report.updated).toBe(1);
    expect((await findEvent(targetEventId)).providerMetadata).toEqual({
      iCalUID: "shared@google.com",
    });
    expect((await findEvent(otherEventId)).providerMetadata).toBeNull();
  });
});
