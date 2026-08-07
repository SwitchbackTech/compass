import { faker } from "@faker-js/faker";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { rediscoverStaleCalendarLists } from "@sync/domain/calendar-list-rediscovery.service";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const objectId = () => faker.database.mongodbObjectId();
const now = () => new Date("2026-08-07T00:00:00.000Z");
// calendarList resources not fully re-listed since this instant are stale.
const staleBefore = new Date("2026-08-06T00:00:00.000Z");

describe("calendar-list rediscovery sweep (rediscoverStaleCalendarLists)", () => {
  const storage = setupSyncStorage(import.meta.url);
  let resources: SyncResourceRepository;
  let jobs: JobRepository;
  let credentials: CredentialRepository;

  beforeEach(() => {
    resources = new SyncResourceRepository(storage.db());
    jobs = new JobRepository(storage.db());
    credentials = new CredentialRepository(storage.db());
  });

  const deps = () => ({ resources, jobs });

  // A connection's calendarList resource, holding a cursor (as a live
  // connection's does after its initial connect) and a given lastSuccessAt.
  // Pass withCredential: false to simulate a dead/disconnected connection.
  const seedCalendarListResource = async (
    lastSuccessAt: Date | null,
    options: { withCredential?: boolean } = {},
  ): Promise<SyncResourceRecord> => {
    const tenantId = objectId() as SyncResourceRecord["tenantId"];
    const principalId = objectId() as SyncResourceRecord["principalId"];
    const connectionId = objectId() as SyncResourceRecord["connectionId"];
    const resource = await resources.ensure({
      tenantId,
      principalId,
      connectionId,
      resourceKind: "calendarList",
      calendarId: null,
    });
    if (options.withCredential ?? true) {
      await credentials.store({
        connectionId,
        provider: "google",
        refreshToken: "refresh-token",
        scopes: [],
      });
    }
    if (lastSuccessAt) {
      await resources.advanceCursor(
        tenantId,
        principalId,
        resource._id,
        "cursor-token",
        lastSuccessAt,
      );
    }
    return resource;
  };

  const jobByKey = (coalescingKey: string) =>
    storage.db().collection(SYNC_COLLECTIONS.jobs).findOne({ coalescingKey });

  const jobCount = () =>
    storage.db().collection(SYNC_COLLECTIONS.jobs).countDocuments({});

  const resourceById = (id: string) =>
    storage.db().collection(SYNC_COLLECTIONS.syncResources).findOne({
      _id: id,
    });

  it("clears the cursor and enqueues a connection-scoped calendarListSync for a stale resource", async () => {
    const stale = await seedCalendarListResource(
      new Date("2026-08-01T00:00:00.000Z"),
    );

    const enqueued = await rediscoverStaleCalendarLists(
      deps(),
      staleBefore,
      now,
    );

    expect(enqueued).toBe(1);
    const record = await resourceById(stale._id);
    expect(record?.syncCursor).toBeNull();
    // lastSuccessAt is the staleness key the sweep sorts on; clearing the
    // cursor must not also touch it, or the resource would re-win the front
    // of every subsequent sweep before the pass it triggered ever runs.
    expect(record?.lastSuccessAt).toEqual(new Date("2026-08-01T00:00:00.000Z"));

    const job = await jobByKey(`calendarListSync:${stale.connectionId}`);
    expect(job?.kind).toBe("calendarListSync");
    // Connection-scoped, not resource-scoped: matches registerConnection's
    // own enqueue shape so the two never race on different coalescing keys.
    expect(job?.resourceId).toBeNull();
    expect(job?.tenantId).toBe(stale.tenantId);
  });

  it("skips a resource re-listed more recently than the threshold", async () => {
    await seedCalendarListResource(new Date("2026-08-06T12:00:00.000Z")); // after staleBefore

    const enqueued = await rediscoverStaleCalendarLists(
      deps(),
      staleBefore,
      now,
    );

    expect(enqueued).toBe(0);
    expect(await jobCount()).toBe(0);
  });

  it("re-discovers a resource that has never succeeded", async () => {
    const fresh = await seedCalendarListResource(null);

    const enqueued = await rediscoverStaleCalendarLists(
      deps(),
      staleBefore,
      now,
    );

    expect(enqueued).toBe(1);
    expect(
      await jobByKey(`calendarListSync:${fresh.connectionId}`),
    ).not.toBeNull();
  });

  it("coalesces onto an already-pending calendarListSync job while still clearing the cursor", async () => {
    // registerConnection may have already enqueued calendarListSync (e.g. a
    // reconnect raced the sweep). The sweep's enqueue must collapse onto that
    // job rather than mint a second one, since JobRepository.enqueue only
    // $setOnInsert's — but the cursor clear still has to land, because
    // whichever job runs reads the cursor fresh at execution time.
    const stale = await seedCalendarListResource(
      new Date("2026-08-01T00:00:00.000Z"),
    );
    await jobs.enqueue({
      tenantId: stale.tenantId,
      principalId: stale.principalId,
      connectionId: stale.connectionId,
      resourceId: null,
      commandId: null,
      kind: "calendarListSync",
      priority: 0,
      runAfter: now(),
      coalescingKey: `calendarListSync:${stale.connectionId}`,
    });

    const enqueued = await rediscoverStaleCalendarLists(
      deps(),
      staleBefore,
      now,
    );

    expect(enqueued).toBe(1);
    expect(
      await storage
        .db()
        .collection(SYNC_COLLECTIONS.jobs)
        .countDocuments({
          coalescingKey: `calendarListSync:${stale.connectionId}`,
        }),
    ).toBe(1);
    const record = await resourceById(stale._id);
    expect(record?.syncCursor).toBeNull();
  });

  it("excludes a resource whose connection has no stored credential, however stale", async () => {
    const deadCredential = await seedCalendarListResource(null, {
      withCredential: false,
    });
    const healthy = await seedCalendarListResource(
      new Date("2026-08-01T00:00:00.000Z"),
    );

    const enqueued = await rediscoverStaleCalendarLists(
      deps(),
      staleBefore,
      now,
    );

    expect(enqueued).toBe(1);
    expect(
      await jobByKey(`calendarListSync:${healthy.connectionId}`),
    ).not.toBeNull();
    expect(
      await jobByKey(`calendarListSync:${deadCredential.connectionId}`),
    ).toBeNull();
  });

  it("rotates a permanently-failing connection behind others via lastAttemptAt", async () => {
    // Without stamping lastAttemptAt, a connection whose discovery always
    // errors before succeeding ties at lastAttemptAt: null forever and
    // re-wins the front of every sweep, starving the resources behind it —
    // the same dead-credential-cohort pathology reconcile hit on 2026-07-29,
    // here for calendarList resources instead of events.
    const doomed = await seedCalendarListResource(null);
    const healthy = await seedCalendarListResource(
      new Date("2026-08-01T00:00:00.000Z"),
    );
    await resources.markAttempt(
      doomed.tenantId,
      doomed.principalId,
      doomed._id,
      new Date("2026-08-06T16:00:00.000Z"),
    );

    const enqueued = await rediscoverStaleCalendarLists(
      deps(),
      staleBefore,
      now,
      1,
    );

    expect(enqueued).toBe(1);
    expect(
      await jobByKey(`calendarListSync:${healthy.connectionId}`),
    ).not.toBeNull();
    expect(
      await jobByKey(`calendarListSync:${doomed.connectionId}`),
    ).toBeNull();
  });

  it("skips a connection whose cursor clear or enqueue fails and sweeps the rest", async () => {
    const poisoned = await seedCalendarListResource(
      new Date("2026-08-01T00:00:00.000Z"),
    );
    const healthy = await seedCalendarListResource(
      new Date("2026-08-02T00:00:00.000Z"),
    );
    // A job doc that cannot be parsed back out, sitting on the coalescing key
    // the sweep is about to reuse — mirrors the 2026-07-31 fleet-freeze shape
    // (resource-sweep-enqueue.reconcile.db.test.ts) for this sweep's own key.
    await storage
      .db()
      .collection(SYNC_COLLECTIONS.jobs)
      .insertOne({
        _id: objectId(),
        coalescingKey: `calendarListSync:${poisoned.connectionId}`,
        kind: "notAJobKind",
      } as never);
    const failures: string[] = [];

    const enqueued = await rediscoverStaleCalendarLists(
      {
        resources,
        jobs,
        onError: (_e, connectionId) => failures.push(connectionId),
      },
      staleBefore,
      now,
    );

    expect(enqueued).toBe(1);
    expect(
      await jobByKey(`calendarListSync:${healthy.connectionId}`),
    ).not.toBeNull();
    expect(failures).toEqual([poisoned.connectionId]);
  });
});
