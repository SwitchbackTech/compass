import { faker } from "@faker-js/faker";
import { type Db } from "mongodb";
import { useSyncStorage } from "@sync/__tests__/helpers/storage";
import { type JobEnqueue } from "@sync/storage/contracts/job.contracts";
import { JobRepository } from "@sync/storage/repositories/job.repository";

const objectId = () => faker.database.mongodbObjectId();

const enqueue = (overrides: Partial<JobEnqueue> = {}): JobEnqueue =>
  ({
    tenantId: objectId(),
    principalId: objectId(),
    connectionId: objectId(),
    resourceId: null,
    commandId: null,
    kind: "incrementalPull",
    priority: 2,
    runAfter: new Date("2026-07-20T12:00:00.000Z"),
    coalescingKey: `pull:${objectId()}`,
    ...overrides,
  }) as JobEnqueue;

describe("JobRepository", () => {
  const storage = useSyncStorage();
  let db: Db;
  let repo: JobRepository;

  beforeEach(() => {
    db = storage.db();
    repo = new JobRepository(db);
  });

  it("enqueues a new pending job", async () => {
    const job = await repo.enqueue(enqueue());
    expect(job.state).toBe("pending");
    expect(job.attempt).toBe(0);
    expect(job.leaseOwner).toBeNull();
  });

  it("coalesces repeated enqueues of the same key into one job", async () => {
    const coalescingKey = "pull:resource-1";
    const first = await repo.enqueue(enqueue({ coalescingKey, priority: 2 }));
    const second = await repo.enqueue(enqueue({ coalescingKey, priority: 9 }));

    expect(second._id).toBe(first._id);
    // The existing job is returned unchanged — a storm does not bump priority.
    expect(second.priority).toBe(2);
    expect(await db.collection("jobs").countDocuments()).toBe(1);
  });

  it("allows a fresh job under the same key after the previous one is removed", async () => {
    const coalescingKey = "pull:resource-2";
    const first = await repo.enqueue(enqueue({ coalescingKey }));
    expect(await repo.remove(first._id, coalescingKey)).toBe(true);

    const second = await repo.enqueue(enqueue({ coalescingKey }));
    expect(second._id).not.toBe(first._id);
    expect(await db.collection("jobs").countDocuments()).toBe(1);
  });

  it("does not remove a different job that reused the key", async () => {
    const coalescingKey = "pull:resource-3";
    const first = await repo.enqueue(enqueue({ coalescingKey }));
    // Simulate: our job completes, a new one is enqueued under the same key.
    await repo.remove(first._id, coalescingKey);
    const second = await repo.enqueue(enqueue({ coalescingKey }));

    // A late remove of the ORIGINAL id must not delete the new job.
    expect(await repo.remove(first._id, coalescingKey)).toBe(false);
    expect(
      await repo.findById(second.tenantId, second.principalId, second._id),
    ).not.toBeNull();
  });

  it("scopes findById to the owning principal", async () => {
    const job = await repo.enqueue(enqueue());
    expect(
      await repo.findById(
        job.tenantId,
        objectId() as JobEnqueue["principalId"],
        job._id,
      ),
    ).toBeNull();
  });

  it("rejects a raw duplicate insert violating the coalescing index", async () => {
    const collection = db.collection("jobs");
    await collection.insertOne({
      _id: objectId(),
      coalescingKey: "k",
    } as never);
    await expect(
      collection.insertOne({ _id: objectId(), coalescingKey: "k" } as never),
    ).rejects.toThrow();
  });

  describe("work leases", () => {
    const NOW = new Date("2026-07-20T12:00:00.000Z");
    const LEASE_MS = 60_000;
    const past = (ms: number) => new Date(NOW.getTime() - ms);
    const future = (ms: number) => new Date(NOW.getTime() + ms);

    it("claims a due pending job and leases it to the worker", async () => {
      await repo.enqueue(enqueue({ runAfter: past(1000) }));
      const claimed = await repo.claimDueJob("worker-1", NOW, LEASE_MS);
      expect(claimed?.state).toBe("claimed");
      expect(claimed?.leaseOwner).toBe("worker-1");
      expect(claimed?.attempt).toBe(1);
      expect(claimed?.leaseExpiresAt).toEqual(future(LEASE_MS));
    });

    it("does not claim a job whose runAfter is still in the future", async () => {
      await repo.enqueue(enqueue({ runAfter: future(60_000) }));
      expect(await repo.claimDueJob("worker-1", NOW, LEASE_MS)).toBeNull();
    });

    it("lets only one of two racing workers claim a single due job", async () => {
      await repo.enqueue(enqueue({ runAfter: past(1000) }));
      const [a, b] = await Promise.all([
        repo.claimDueJob("worker-a", NOW, LEASE_MS),
        repo.claimDueJob("worker-b", NOW, LEASE_MS),
      ]);
      // Exactly one worker gets the job; the other gets nothing.
      const claimed = [a, b].filter(Boolean);
      expect(claimed).toHaveLength(1);
    });

    it("claims jobs in priority then age order", async () => {
      await repo.enqueue(
        enqueue({ coalescingKey: "low", priority: 1, runAfter: past(2000) }),
      );
      await repo.enqueue(
        enqueue({ coalescingKey: "high", priority: 9, runAfter: past(1000) }),
      );
      const first = await repo.claimDueJob("w", NOW, LEASE_MS);
      expect(first?.coalescingKey).toBe("high");
    });

    it("reclaims a job whose lease has expired (previous owner crashed)", async () => {
      await repo.enqueue(enqueue({ runAfter: past(1000) }));
      const first = await repo.claimDueJob("crashed-worker", NOW, LEASE_MS);
      expect(first).not.toBeNull();

      // A second worker claims well after the lease would have expired.
      const later = future(LEASE_MS + 1000);
      const reclaimed = await repo.claimDueJob("fresh-worker", later, LEASE_MS);
      expect(reclaimed?._id).toBe(first?._id);
      expect(reclaimed?.leaseOwner).toBe("fresh-worker");
      expect(reclaimed?.attempt).toBe(2);
    });

    it("does not let a stale worker heartbeat, complete, retry, or fail", async () => {
      await repo.enqueue(enqueue({ runAfter: past(1000) }));
      const job = await repo.claimDueJob("owner", NOW, LEASE_MS);
      const id = job?._id as NonNullable<typeof job>["_id"];

      expect(await repo.heartbeat(id, "intruder", NOW, LEASE_MS)).toBe(false);
      expect(await repo.complete(id, "intruder")).toBe(false);
      expect(
        await repo.scheduleRetry(
          id,
          "intruder",
          future(5000),
          "retryableTransient",
        ),
      ).toBe(false);
      expect(await repo.fail(id, "intruder", "permanent")).toBe(false);
      // The real owner still can.
      expect(await repo.heartbeat(id, "owner", NOW, LEASE_MS)).toBe(true);
    });

    it("reschedules a retry back to the pending pool", async () => {
      await repo.enqueue(enqueue({ runAfter: past(1000) }));
      const job = await repo.claimDueJob("owner", NOW, LEASE_MS);
      const id = job?._id as NonNullable<typeof job>["_id"];
      const retryAt = future(30_000);
      expect(
        await repo.scheduleRetry(id, "owner", retryAt, "retryableTransient"),
      ).toBe(true);

      const after = await repo.findById(job!.tenantId, job!.principalId, id);
      expect(after?.state).toBe("pending");
      expect(after?.runAfter).toEqual(retryAt);
      expect(after?.leaseOwner).toBeNull();
      expect(after?.failureClass).toBe("retryableTransient");
    });

    it("completes a job the owner holds", async () => {
      await repo.enqueue(enqueue({ runAfter: past(1000) }));
      const job = await repo.claimDueJob("owner", NOW, LEASE_MS);
      expect(await repo.complete(job!._id, "owner")).toBe(true);
      expect(await db.collection("jobs").countDocuments()).toBe(0);
    });

    it("releases all of a worker's jobs to pending on graceful shutdown", async () => {
      await repo.enqueue(enqueue({ coalescingKey: "a", runAfter: past(1000) }));
      await repo.enqueue(enqueue({ coalescingKey: "b", runAfter: past(1000) }));
      await repo.claimDueJob("leaving-worker", NOW, LEASE_MS);
      await repo.claimDueJob("leaving-worker", NOW, LEASE_MS);

      expect(await repo.releaseOwned("leaving-worker")).toBe(2);
      const stillClaimed = await db
        .collection("jobs")
        .countDocuments({ state: "claimed" });
      expect(stillClaimed).toBe(0);
    });
  });
});
