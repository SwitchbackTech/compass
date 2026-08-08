import { faker } from "@faker-js/faker";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { syncCalendarList } from "@sync/domain/calendar-list-sync.service";
import {
  type CalendarDiscovery,
  type DiscoveredCalendar,
  type ProviderCalendarAdapter,
  ProviderCalendarError,
} from "@sync/providers/provider-calendar.port";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type ProviderConnectionRecord } from "@sync/storage/contracts/provider-connection.contracts";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const objectId = () => faker.database.mongodbObjectId();
const now = () => new Date("2026-07-10T00:00:00.000Z");

const discovered = (
  providerCalendarId: string,
  active = true,
): DiscoveredCalendar => ({
  providerCalendarId,
  displayName: providerCalendarId,
  color: null,
  primary: false,
  active,
  accessRole: "owner",
  capabilities: {
    canReadEvents: true,
    canWriteEvents: true,
    canReadBusy: true,
    canInviteAttendees: true,
  },
});

// Replays scripted discovery passes and records the cursor each call received.
// `cursorExpiredFirst` throws cursorExpired on the first CURSORED call, so a test
// exercises the full re-list fallback.
class FakeDiscovery implements ProviderCalendarAdapter {
  readonly provider = "google" as const;
  cursors: Array<string | undefined> = [];
  #passes: CalendarDiscovery[];
  #cursorExpiredFirst: boolean;
  #threw = false;

  constructor(passes: CalendarDiscovery[], cursorExpiredFirst = false) {
    this.#passes = [...passes];
    this.#cursorExpiredFirst = cursorExpiredFirst;
  }
  discoverCalendars = async (input: {
    accessToken: string;
    cursor?: string;
  }): Promise<CalendarDiscovery> => {
    this.cursors.push(input.cursor);
    if (
      this.#cursorExpiredFirst &&
      input.cursor !== undefined &&
      !this.#threw
    ) {
      this.#threw = true;
      throw new ProviderCalendarError("cursorExpired", "stale token");
    }
    return this.#passes.shift() ?? { calendars: [], cursor: null };
  };
}

const custody = {
  getValidAccessToken: async () => "access-token",
  discardRevoked: async () => {},
};

describe("syncCalendarList", () => {
  const storage = setupSyncStorage(import.meta.url);
  let calendars: ProviderCalendarRepository;
  let resources: SyncResourceRepository;
  let jobs: JobRepository;

  beforeEach(() => {
    calendars = new ProviderCalendarRepository(storage.db());
    resources = new SyncResourceRepository(storage.db());
    jobs = new JobRepository(storage.db());
  });

  const connection = (): ProviderConnectionRecord =>
    ({
      _id: objectId(),
      tenantId: objectId(),
      principalId: objectId(),
    }) as ProviderConnectionRecord;

  const deps = (discovery: FakeDiscovery) => ({
    calendars,
    resources,
    jobs,
    discovery,
    custody,
  });

  const calendarDocs = (conn: ProviderConnectionRecord) =>
    storage
      .db()
      .collection(SYNC_COLLECTIONS.providerCalendars)
      .find({ connectionId: conn._id })
      .toArray();

  const importJobs = () =>
    storage
      .db()
      .collection(SYNC_COLLECTIONS.jobs)
      .find({ kind: "initialImport" })
      .toArray();

  const calendarListResource = (conn: ProviderConnectionRecord) =>
    storage
      .db()
      .collection(SYNC_COLLECTIONS.syncResources)
      .findOne({ connectionId: conn._id, resourceKind: "calendarList" });

  it("discovers calendars, persists them, and enqueues an import per active calendar", async () => {
    const conn = connection();
    const discovery = new FakeDiscovery([
      {
        calendars: [
          discovered("primary"),
          discovered("team"),
          discovered("holidays", false),
        ],
        cursor: "cur-1",
      },
    ]);

    const result = await syncCalendarList(deps(discovery), conn, now);

    expect(result).toEqual({ discovered: 3, imported: 2 });
    expect(await calendarDocs(conn)).toHaveLength(3);
    // One initial import per ACTIVE calendar (2), none for the inactive one.
    const enqueued = await importJobs();
    expect(enqueued).toHaveLength(2);
    // The discovery cursor is stored on the calendarList resource for next pass.
    expect((await calendarListResource(conn))?.syncCursor).toBe("cur-1");
    expect(discovery.cursors).toEqual([undefined]); // first pass is a full list
  });

  it("ensures an events resource for each active calendar so its import can run", async () => {
    const conn = connection();
    const discovery = new FakeDiscovery([
      { calendars: [discovered("primary")], cursor: "c" },
    ]);

    await syncCalendarList(deps(discovery), conn, now);

    const eventsResources = await storage
      .db()
      .collection(SYNC_COLLECTIONS.syncResources)
      .find({ connectionId: conn._id, resourceKind: "events" })
      .toArray();
    expect(eventsResources).toHaveLength(1);
    // The enqueued import targets that events resource.
    const [job] = await importJobs();
    expect(job?.resourceId).toBe(eventsResources[0]?._id);
    expect(job?.coalescingKey).toBe(`initialImport:${eventsResources[0]?._id}`);
  });

  it("clears persisted unwatchable verdicts on a full pass so each gets one retry", async () => {
    const conn = connection();
    // First full pass discovers the calendar and bootstraps its events resource.
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          { calendars: [discovered("primary")], cursor: null },
        ]),
      ),
      conn,
      now,
    );
    const eventsResource = await storage
      .db()
      .collection(SYNC_COLLECTIONS.syncResources)
      .findOne({ connectionId: conn._id, resourceKind: "events" });
    await resources.markWatchUnsupported(
      conn.tenantId,
      conn.principalId,
      String(eventsResource?.["_id"]),
      now(),
    );

    // Next pass is full again (no cursor stored) - the verdict is cleared for
    // one fresh watch attempt.
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          { calendars: [discovered("primary")], cursor: null },
        ]),
      ),
      conn,
      now,
    );

    const after = await storage
      .db()
      .collection(SYNC_COLLECTIONS.syncResources)
      .findOne({ connectionId: conn._id, resourceKind: "events" });
    expect(after?.["watchUnsupportedAt"]).toBeNull();
  });

  it("retires a calendar no longer present on a full list", async () => {
    const conn = connection();
    // First full pass discovers two calendars.
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          {
            calendars: [discovered("primary"), discovered("gone")],
            cursor: null,
          },
        ]),
      ),
      conn,
      now,
    );
    // Second full pass (no cursor stored, since first returned null) omits "gone".
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          { calendars: [discovered("primary")], cursor: null },
        ]),
      ),
      conn,
      now,
    );

    const docs = await calendarDocs(conn);
    const gone = docs.find((d) => d.providerCalendarId === "gone");
    const primary = docs.find((d) => d.providerCalendarId === "primary");
    expect(gone?.active).toBe(false);
    expect(primary?.active).toBe(true);
  });

  it("clears a prior discovery failure even when rediscovery returns no cursor", async () => {
    const conn = connection();
    const list = await resources.ensure({
      tenantId: conn.tenantId,
      principalId: conn.principalId,
      connectionId: conn._id,
      resourceKind: "calendarList",
      calendarId: null,
    });
    await resources.markReadFailure(
      conn.tenantId,
      conn.principalId,
      list._id,
      new Date("2026-07-01T00:00:00.000Z"),
      "The user must be signed up for Google Calendar. (HTTP 403, reason notACalendarUser)",
    );

    await syncCalendarList(
      deps(
        new FakeDiscovery([
          { calendars: [discovered("primary")], cursor: null },
        ]),
      ),
      conn,
      now,
    );

    const after = await calendarListResource(conn);
    expect(after?.lastReadFailureAt).toBeNull();
    expect(after?.lastReadFailureDetail).toBeNull();
    expect(after?.lastSuccessAt).toEqual(now());
    // Null discovery cursor must not wipe/store a cursor — next pass full-lists.
    expect(after?.syncCursor).toBeNull();
  });

  it("stamps lastAttemptAt on the calendarList resource before it can fail", async () => {
    // Without this, the rediscovery sweep's rotation sort (lastAttemptAt) ties
    // at null forever for a permanently-failing connection, and it re-wins the
    // front of every sweep cycle (calendar-list-rediscovery.db.test.ts covers
    // the sweep side; this covers that syncCalendarList is what stamps it).
    const conn = connection();
    const discovery = new FakeDiscovery([
      { calendars: [discovered("primary")], cursor: "c" },
    ]);

    await syncCalendarList(deps(discovery), conn, now);

    expect((await calendarListResource(conn))?.lastAttemptAt).toEqual(now());
  });

  it("clears the local push channel of a retired calendar's events resource", async () => {
    const conn = connection();
    // First full pass discovers "gone" and bootstraps its events resource.
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          {
            calendars: [discovered("primary"), discovered("gone")],
            cursor: null,
          },
        ]),
      ),
      conn,
      now,
    );
    const goneCalendar = (await calendarDocs(conn)).find(
      (d) => d.providerCalendarId === "gone",
    );
    const goneEventsResourceId = (
      await storage.db().collection(SYNC_COLLECTIONS.syncResources).findOne({
        connectionId: conn._id,
        resourceKind: "events",
        calendarId: goneCalendar?._id,
      })
    )?._id as string;
    // Simulate an established push channel, as a calendar with prior sync
    // history would hold.
    await resources.updateSubscription(
      conn.tenantId,
      conn.principalId,
      goneEventsResourceId,
      {
        subscriptionId: "channel-1",
        subscriptionResourceId: "resource-1",
        subscriptionToken: "token-1",
        subscriptionExpiresAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    );

    // Second full pass omits "gone", retiring it.
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          { calendars: [discovered("primary")], cursor: null },
        ]),
      ),
      conn,
      now,
    );

    const goneEventsResource = await storage
      .db()
      .collection(SYNC_COLLECTIONS.syncResources)
      .findOne({ _id: goneEventsResourceId });
    expect(goneEventsResource?.subscriptionId).toBeNull();
    expect(goneEventsResource?.subscriptionExpiresAt).toBeNull();
  });

  it("logs a warning naming the calendars a full pass retired", async () => {
    const conn = connection();
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          {
            calendars: [discovered("primary"), discovered("gone")],
            cursor: null,
          },
        ]),
      ),
      conn,
      now,
    );
    const goneCalendar = (await calendarDocs(conn)).find(
      (d) => d.providerCalendarId === "gone",
    );
    const warnings: string[] = [];

    await syncCalendarList(
      {
        ...deps(
          new FakeDiscovery([
            { calendars: [discovered("primary")], cursor: null },
          ]),
        ),
        log: { warn: (message) => warnings.push(message) },
      },
      conn,
      now,
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(goneCalendar?._id as string);
    expect(warnings[0]).toContain(conn._id);
  });

  it("does not retire everything when a full list comes back empty", async () => {
    const conn = connection();
    // First full pass discovers a calendar (cursor null keeps the next pass full).
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          { calendars: [discovered("primary")], cursor: null },
        ]),
      ),
      conn,
      now,
    );
    // A full pass that returns zero calendars is a non-answer (a provider blip),
    // not "all removed": the existing calendar must stay active.
    await syncCalendarList(
      deps(new FakeDiscovery([{ calendars: [], cursor: null }])),
      conn,
      now,
    );

    const primary = (await calendarDocs(conn)).find(
      (d) => d.providerCalendarId === "primary",
    );
    expect(primary?.active).toBe(true);
  });

  it("does not retire absent calendars on an incremental pass", async () => {
    const conn = connection();
    // Seed a full pass that stores a cursor, so the next pass is incremental.
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          {
            calendars: [discovered("primary"), discovered("team")],
            cursor: "cur-1",
          },
        ]),
      ),
      conn,
      now,
    );
    // Incremental pass returns only a changed calendar; "team" is absent but must
    // stay active (absence means unchanged, not removed).
    const incremental = new FakeDiscovery([
      { calendars: [discovered("primary")], cursor: "cur-2" },
    ]);
    await syncCalendarList(deps(incremental), conn, now);

    expect(incremental.cursors).toEqual(["cur-1"]); // resumed from the stored cursor
    const team = (await calendarDocs(conn)).find(
      (d) => d.providerCalendarId === "team",
    );
    expect(team?.active).toBe(true);
  });

  it("re-lists in full when the incremental cursor has expired", async () => {
    const conn = connection();
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          {
            calendars: [discovered("primary"), discovered("stale")],
            cursor: "cur-1",
          },
        ]),
      ),
      conn,
      now,
    );
    // The cursored call throws cursorExpired; the fallback full list omits "stale".
    const expired = new FakeDiscovery(
      [{ calendars: [discovered("primary")], cursor: "cur-2" }],
      true,
    );
    await syncCalendarList(deps(expired), conn, now);

    // It tried the stored cursor, then re-listed in full (undefined cursor).
    expect(expired.cursors).toEqual(["cur-1", undefined]);
    // Because the fallback was a full list, the absent "stale" calendar is retired.
    const stale = (await calendarDocs(conn)).find(
      (d) => d.providerCalendarId === "stale",
    );
    expect(stale?.active).toBe(false);
  });

  it("throws on a non-cursor discovery failure so the worker retries", async () => {
    const conn = connection();
    const discovery = {
      provider: "google" as const,
      discoverCalendars: async () => {
        throw new ProviderCalendarError("discoveryFailed", "boom");
      },
    };

    await expect(
      syncCalendarList(deps(discovery as unknown as FakeDiscovery), conn, now),
    ).rejects.toThrow("boom");
  });

  it("is idempotent: a repeated pass coalesces into one import per calendar", async () => {
    const conn = connection();
    const pass = (): CalendarDiscovery => ({
      calendars: [discovered("primary")],
      cursor: "c",
    });

    await syncCalendarList(deps(new FakeDiscovery([pass()])), conn, now);
    await syncCalendarList(deps(new FakeDiscovery([pass()])), conn, now);

    // One events resource, one coalesced import job — not two.
    const eventsResources = await storage
      .db()
      .collection(SYNC_COLLECTIONS.syncResources)
      .find({ connectionId: conn._id, resourceKind: "events" })
      .toArray();
    expect(eventsResources).toHaveLength(1);
    expect(await importJobs()).toHaveLength(1);
  });
});
