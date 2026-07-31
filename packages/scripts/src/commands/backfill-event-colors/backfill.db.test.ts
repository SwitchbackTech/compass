import {
  type BackfillDeps,
  backfillEventColors,
  type GoogleColorItem,
} from "@scripts/commands/backfill-event-colors/backfill";
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

describe("backfillEventColors", () => {
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
    eventLabels: Array<{ id: string; hex: string }> = [],
  ): Promise<ProviderCalendarRecord> {
    return calendars.upsertByProviderCalendar({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      connectionId: connection._id,
      providerCalendarId: "user@example.com",
      displayName: "Primary",
      color: null,
      eventLabels,
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

  // Raw insert mirroring a preseed-migrated row: provider-owned, colorless
  // content, sentinel providerVersion.
  async function seedEvent(
    connection: ProviderConnectionRecord,
    calendar: ProviderCalendarRecord,
    providerEventId: string,
    content: Partial<EventRecord["content"]> = {},
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
        providerVersion: "migrated-from-legacy",
        providerUpdatedAt: new Date("2024-01-01T00:00:00Z"),
        deliveryState: null,
        providerMetadata: null,
        content: {
          title: "Dad's Birthday",
          description: "",
          location: null,
          organizer: null,
          attendees: [],
          conference: null,
          ...content,
        },
        schedule: { kind: "allDay", start: "2026-08-20", end: "2026-08-21" },
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
    pages: GoogleColorItem[][],
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
      listColorPage: () => {
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

  it("sets slot colors from colorId and hex colors from event labels, across pages", async () => {
    const connection = await seedConnection();
    const calendar = await seedCalendar(connection, [
      { id: "label-1", hex: "#AB1010" },
    ]);
    const slotEventId = await seedEvent(connection, calendar, "ev-colorid");
    const labelEventId = await seedEvent(connection, calendar, "ev-label");

    const report = await backfillEventColors(
      storage.db(),
      depsWithPages([
        [{ id: "ev-colorid", colorId: "11" }],
        [{ id: "ev-label", eventLabelId: "label-1" }],
      ]),
      { dryRun: false },
    );

    expect(report.coloredInGoogle).toBe(2);
    expect(report.updated).toBe(2);
    const slotEvent = await findEvent(slotEventId);
    expect(slotEvent.content.color).toBe("red");
    expect(slotEvent.content.colorHex).toBeUndefined();
    expect(slotEvent.providerVersion).toBe("migrated-from-legacy");
    const labelEvent = await findEvent(labelEventId);
    expect(labelEvent.content.colorHex).toBe("#AB1010");
    expect(labelEvent.content.color).toBeUndefined();
  });

  it("never touches an event that already has a color, including an explicit null clear", async () => {
    const connection = await seedConnection();
    const calendar = await seedCalendar(connection);
    const coloredId = await seedEvent(connection, calendar, "ev-colored", {
      color: "blue",
    });
    const clearedId = await seedEvent(connection, calendar, "ev-cleared", {
      color: null,
    });

    const report = await backfillEventColors(
      storage.db(),
      depsWithPages([
        [
          { id: "ev-colored", colorId: "11" },
          { id: "ev-cleared", colorId: "11" },
        ],
      ]),
      { dryRun: false },
    );

    expect(report.coloredInGoogle).toBe(2);
    expect(report.matchedMissingColor).toBe(0);
    expect(report.updated).toBe(0);
    expect((await findEvent(coloredId)).content.color).toBe("blue");
    expect((await findEvent(clearedId)).content.color).toBeNull();
  });

  it("writes nothing for events Google reports colorless, and for unknown label ids", async () => {
    const connection = await seedConnection();
    const calendar = await seedCalendar(connection);
    const plainId = await seedEvent(connection, calendar, "ev-plain");

    const report = await backfillEventColors(
      storage.db(),
      depsWithPages([
        [{ id: "ev-plain" }, { id: "ev-plain", eventLabelId: "label-deleted" }],
      ]),
      { dryRun: false },
    );

    expect(report.googleEventsSeen).toBe(2);
    expect(report.coloredInGoogle).toBe(0);
    expect(report.updated).toBe(0);
    const plain = await findEvent(plainId);
    expect(plain.content.color).toBeUndefined();
    expect(plain.content.colorHex).toBeUndefined();
  });

  it("dry-run reports matches without persisting; rerun after apply is a no-op", async () => {
    const connection = await seedConnection();
    const calendar = await seedCalendar(connection);
    const eventId = await seedEvent(connection, calendar, "ev-colorid");
    const pages = () => depsWithPages([[{ id: "ev-colorid", colorId: "3" }]]);

    const dry = await backfillEventColors(storage.db(), pages(), {
      dryRun: true,
    });
    expect(dry.matchedMissingColor).toBe(1);
    expect(dry.updated).toBe(0);
    expect(dry.samples).toEqual([
      {
        connectionId: connection._id,
        calendarId: calendar._id,
        providerEventId: "ev-colorid",
        color: "plum",
      },
    ]);
    expect((await findEvent(eventId)).content.color).toBeUndefined();

    const applied = await backfillEventColors(storage.db(), pages(), {
      dryRun: false,
    });
    expect(applied.updated).toBe(1);
    expect((await findEvent(eventId)).content.color).toBe("plum");

    const rerun = await backfillEventColors(storage.db(), pages(), {
      dryRun: false,
    });
    expect(rerun.matchedMissingColor).toBe(0);
    expect(rerun.updated).toBe(0);
  });

  it("skips a credential-less connection and still processes the rest", async () => {
    const doomed = await seedConnection();
    await seedCalendar(doomed);
    const healthy = await seedConnection();
    const healthyCalendar = await seedCalendar(healthy);
    const eventId = await seedEvent(healthy, healthyCalendar, "ev-colorid");

    const report = await backfillEventColors(
      storage.db(),
      depsWithPages([[{ id: "ev-colorid", colorId: "11" }]], {
        failConnectionIds: [doomed._id],
      }),
      { dryRun: false },
    );

    expect(report.connections).toBe(2);
    expect(report.connectionsSkipped).toBe(1);
    expect(report.updated).toBe(1);
    expect((await findEvent(eventId)).content.color).toBe("red");
  });
});
