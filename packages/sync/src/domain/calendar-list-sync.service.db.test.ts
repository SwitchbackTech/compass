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
  invalidateAccessToken: async () => {},
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

  // Give a discovered calendar's events resource an established push channel,
  // as a calendar with prior sync history would hold. Returns the resource id
  // so the test can assert on the cleared fields afterwards.
  const seedSubscribedEventsResource = async (
    conn: ProviderConnectionRecord,
    providerCalendarId: string,
  ) => {
    const calendar = (await calendarDocs(conn)).find(
      (d) => d.providerCalendarId === providerCalendarId,
    );
    const resourceId = (
      await storage.db().collection(SYNC_COLLECTIONS.syncResources).findOne({
        connectionId: conn._id,
        resourceKind: "events",
        calendarId: calendar?._id,
      })
    )?._id as string;
    await resources.updateSubscription(
      conn.tenantId,
      conn.principalId,
      resourceId,
      {
        subscriptionId: "channel-1",
        subscriptionResourceId: "resource-1",
        subscriptionToken: "token-1",
        subscriptionExpiresAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    );
    return resourceId;
  };

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

    expect(result).toMatchObject({
      discovered: 3,
      imported: 2,
      changedDuringSync: false,
    });
    // The returned resource is the post-pass read, so the caller can gate the
    // watch followup on its subscription fields.
    expect(result.resource.resourceKind).toBe("calendarList");
    expect(result.resource.syncCursor).toBe("cur-1");
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
    const goneEventsResourceId = await seedSubscribedEventsResource(
      conn,
      "gone",
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

  it("clears the push channel when a calendar is upserted inactive on an incremental pass", async () => {
    // A hidden or deleted calendar arrives as an active:false ENTRY (not an
    // absence), so it never goes through deactivateAbsent — the channel
    // cleanup must cover the upsert path too, or the resource squats at the
    // head of every renewal sweep (dispatch drops subscriptionMaintain for
    // inactive calendars, so subscriptionExpiresAt never advances).
    const conn = connection();
    // Full pass discovers "hides" active and returns a cursor, so the next
    // pass is incremental.
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          {
            calendars: [discovered("primary"), discovered("hides")],
            cursor: "c1",
          },
        ]),
      ),
      conn,
      now,
    );
    const hidesEventsResourceId = await seedSubscribedEventsResource(
      conn,
      "hides",
    );

    // Incremental pass (the stored cursor is "c1") reports "hides" inactive.
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          { calendars: [discovered("hides", false)], cursor: "c2" },
        ]),
      ),
      conn,
      now,
    );

    const hidesEventsResource = await storage
      .db()
      .collection(SYNC_COLLECTIONS.syncResources)
      .findOne({ _id: hidesEventsResourceId });
    expect(hidesEventsResource?.subscriptionId).toBeNull();
    expect(hidesEventsResource?.subscriptionExpiresAt).toBeNull();
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

  it("updates the stored display name when rediscovery reports a rename", async () => {
    const conn = connection();
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          {
            calendars: [
              { ...discovered("mens-group"), displayName: "mens-group" },
            ],
            cursor: "cur-1",
          },
        ]),
      ),
      conn,
      now,
    );

    await syncCalendarList(
      deps(
        new FakeDiscovery([
          {
            calendars: [
              {
                ...discovered("mens-group"),
                displayName: "journey-mens-group",
              },
            ],
            cursor: "cur-2",
          },
        ]),
      ),
      conn,
      now,
    );

    const renamed = (await calendarDocs(conn)).find(
      (d) => d.providerCalendarId === "mens-group",
    );
    expect(renamed?.displayName).toBe("journey-mens-group");
  });

  it("clears a change marker the pass has served", async () => {
    const conn = connection();
    await syncCalendarList(
      deps(
        new FakeDiscovery([
          { calendars: [discovered("primary")], cursor: "cur-1" },
        ]),
      ),
      conn,
      now,
    );
    // A webhook stamped the marker before this pass claimed the job.
    const resource = await calendarListResource(conn);
    await resources.markChangeNotified(
      conn.tenantId,
      conn.principalId,
      String(resource?._id),
      now(),
    );

    const result = await syncCalendarList(
      deps(new FakeDiscovery([{ calendars: [], cursor: "cur-2" }])),
      conn,
      now,
    );

    expect(result.changedDuringSync).toBe(false);
    expect((await calendarListResource(conn))?.changeNotifiedAt).toBeNull();
  });

  it("keeps the marker and reports changedDuringSync when a notification lands mid-pass", async () => {
    const conn = connection();
    const inner = new FakeDiscovery([
      { calendars: [discovered("primary")], cursor: "cur-1" },
    ]);
    const midPassStamp = new Date("2026-07-10T00:00:05.000Z");
    // A notification arriving while the provider is being read moves the
    // marker AFTER the pass captured it, so the compare-and-clear must fail.
    const discovery: ProviderCalendarAdapter = {
      provider: "google",
      discoverCalendars: async (input) => {
        const resource = await calendarListResource(conn);
        await resources.markChangeNotified(
          conn.tenantId,
          conn.principalId,
          String(resource?._id),
          midPassStamp,
        );
        return inner.discoverCalendars(input);
      },
    };

    const result = await syncCalendarList(
      { calendars, resources, jobs, discovery, custody },
      conn,
      now,
    );

    expect(result.changedDuringSync).toBe(true);
    expect((await calendarListResource(conn))?.changeNotifiedAt).toEqual(
      midPassStamp,
    );
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
