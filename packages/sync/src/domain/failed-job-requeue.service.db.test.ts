import { faker } from "@faker-js/faker";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { requeueFailedJobs } from "@sync/domain/failed-job-requeue.service";
import { type JobEnqueue } from "@sync/storage/contracts/job.contracts";
import { JobRepository } from "@sync/storage/repositories/job.repository";

const objectId = () => faker.database.mongodbObjectId();
const NOW = new Date("2026-07-20T12:00:00.000Z");
const now = () => NOW;
// Jobs last due before this instant have cooled down enough to requeue.
const cooldownBefore = new Date("2026-07-20T11:30:00.000Z");

describe("requeueFailedJobs", () => {
  const storage = setupSyncStorage(import.meta.url);
  let jobs: JobRepository;

  beforeEach(() => {
    jobs = new JobRepository(storage.db());
  });

  const deps = () => ({ jobs });

  // Enqueue, claim, and fail a job so a test starts directly from
  // state:"failed" without driving a real worker's retry ladder.
  const seedFailed = async (
    overrides: Partial<JobEnqueue> = {},
  ): Promise<string> => {
    const job = await jobs.enqueue({
      tenantId: objectId(),
      principalId: objectId(),
      connectionId: objectId(),
      resourceId: null,
      commandId: null,
      kind: "incrementalPull",
      priority: 0,
      runAfter: new Date("2026-07-20T10:00:00.000Z"),
      coalescingKey: `pull:${objectId()}`,
      ...overrides,
    } as JobEnqueue);
    const claimed = await jobs.claimDueJob("worker", NOW, 60_000);
    await jobs.fail(claimed!._id, "worker", "retryableTransient");
    return job._id;
  };

  it("requeues a cooled-down failed job with a fresh attempt budget", async () => {
    const id = await seedFailed({
      runAfter: new Date("2026-07-20T10:00:00.000Z"),
    });

    const result = await requeueFailedJobs(deps(), cooldownBefore, now, 3);

    expect(result).toEqual({ requeued: 1, exhausted: 0 });
    const raw = await storage
      .db()
      .collection("jobs")
      .findOne({ _id: id as never });
    expect(raw?.state).toBe("pending");
    expect(raw?.runAfter).toEqual(NOW);
    expect(raw?.requeuedCount).toBe(1);
  });

  it("leaves a job that has not cooled down yet failed", async () => {
    await seedFailed({ runAfter: new Date("2026-07-20T11:45:00.000Z") });

    const result = await requeueFailedJobs(deps(), cooldownBefore, now, 3);

    expect(result).toEqual({ requeued: 0, exhausted: 0 });
  });

  it("stops requeuing once a job hits the cap and reports it as exhausted", async () => {
    const id = await seedFailed({
      runAfter: new Date("2026-07-20T10:00:00.000Z"),
    });
    // Burn the requeue budget: requeue, then fail again, `maxRequeues` times.
    for (let cycle = 0; cycle < 2; cycle += 1) {
      await jobs.requeue(id as never, new Date("2026-07-20T10:00:00.000Z"));
      const reclaimed = await jobs.claimDueJob(
        "worker",
        new Date("2026-07-20T10:00:00.000Z"),
        60_000,
      );
      await jobs.fail(reclaimed!._id, "worker", "retryableTransient");
    }

    const result = await requeueFailedJobs(deps(), cooldownBefore, now, 2);

    expect(result).toEqual({ requeued: 0, exhausted: 1 });
  });

  it("does nothing when there are no failed jobs", async () => {
    expect(await requeueFailedJobs(deps(), cooldownBefore, now, 3)).toEqual({
      requeued: 0,
      exhausted: 0,
    });
  });
});
