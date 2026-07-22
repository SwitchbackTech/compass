import { faker } from "@faker-js/faker";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { reconcileStaleCalendars } from "@sync/domain/reconcile.service";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const objectId = () => faker.database.mongodbObjectId();
const now = () => new Date("2026-07-10T00:00:00.000Z");
// Resources not synced since this instant are stale.
const staleBefore = new Date("2026-07-09T00:00:00.000Z");

describe("reconcileStaleCalendars", () => {
  const storage = setupSyncStorage(import.meta.url);
  let resources: SyncResourceRepository;
  let jobs: JobRepository;

  beforeEach(() => {
    resources = new SyncResourceRepository(storage.db());
    jobs = new JobRepository(storage.db());
  });

  const deps = () => ({ resources, jobs });

  // Ensure an events resource and set its last success to `lastSuccessAt`
  // (omit for a never-synced resource). Each gets a distinct calendar so the
  // unique (connection, kind, calendar) identity never collides.
  const seedResource = async (
    lastSuccessAt: Date | null,
  ): Promise<SyncResourceRecord> => {
    const tenantId = objectId() as SyncResourceRecord["tenantId"];
    const principalId = objectId() as SyncResourceRecord["principalId"];
    const resource = await resources.ensure({
      tenantId,
      principalId,
      connectionId: objectId() as SyncResourceRecord["connectionId"],
      resourceKind: "events",
      calendarId: objectId() as SyncResourceRecord["calendarId"],
    });
    if (lastSuccessAt) {
      await resources.advanceCursor(
        tenantId,
        principalId,
        resource._id,
        "cursor",
        lastSuccessAt,
      );
    }
    return resource;
  };

  const jobByKey = (coalescingKey: string) =>
    storage.db().collection(SYNC_COLLECTIONS.jobs).findOne({ coalescingKey });

  const jobCount = () =>
    storage.db().collection(SYNC_COLLECTIONS.jobs).countDocuments({});

  it("enqueues an incremental pull for a stale resource", async () => {
    const stale = await seedResource(new Date("2026-07-01T00:00:00.000Z"));

    const enqueued = await reconcileStaleCalendars(deps(), staleBefore, now);

    expect(enqueued).toBe(1);
    const job = await jobByKey(`incrementalPull:${stale._id}`);
    expect(job?.kind).toBe("incrementalPull");
    expect(job?.resourceId).toBe(stale._id);
    expect(job?.tenantId).toBe(stale.tenantId);
  });

  it("skips a resource synced more recently than the threshold", async () => {
    await seedResource(new Date("2026-07-09T12:00:00.000Z")); // after staleBefore

    const enqueued = await reconcileStaleCalendars(deps(), staleBefore, now);

    expect(enqueued).toBe(0);
    expect(await jobCount()).toBe(0);
  });

  it("enqueues a pull for a never-synced resource (bootstrap)", async () => {
    const fresh = await seedResource(null);

    const enqueued = await reconcileStaleCalendars(deps(), staleBefore, now);

    expect(enqueued).toBe(1);
    expect(await jobByKey(`incrementalPull:${fresh._id}`)).not.toBeNull();
  });

  it("coalesces repeated sweeps into one job per resource", async () => {
    const stale = await seedResource(new Date("2026-07-01T00:00:00.000Z"));

    await reconcileStaleCalendars(deps(), staleBefore, now);
    await reconcileStaleCalendars(deps(), staleBefore, now);

    expect(
      await storage
        .db()
        .collection(SYNC_COLLECTIONS.jobs)
        .countDocuments({ coalescingKey: `incrementalPull:${stale._id}` }),
    ).toBe(1);
  });

  it("bounds the sweep and takes the oldest first", async () => {
    await seedResource(new Date("2026-07-05T00:00:00.000Z"));
    await seedResource(new Date("2026-07-02T00:00:00.000Z")); // oldest
    await seedResource(new Date("2026-07-06T00:00:00.000Z"));

    const enqueued = await reconcileStaleCalendars(deps(), staleBefore, now, 1);

    expect(enqueued).toBe(1);
    // The single job is for the oldest (2026-07-02) resource.
    const jobs2 = await storage
      .db()
      .collection(SYNC_COLLECTIONS.jobs)
      .find({})
      .toArray();
    expect(jobs2).toHaveLength(1);
    const resourceId = jobs2[0]?.resourceId as string;
    const resource = await storage
      .db()
      .collection(SYNC_COLLECTIONS.syncResources)
      .findOne({ _id: resourceId });
    expect(resource?.lastSuccessAt).toEqual(
      new Date("2026-07-02T00:00:00.000Z"),
    );
  });
});
