import { faker } from "@faker-js/faker";
import { type Db } from "mongodb";
import { type SyncJobId } from "@core/types/sync/identity.contracts";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
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
  const storage = setupSyncStorage(import.meta.url);
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

    // Load-bearing with the split claim arms: reclaim must not wait for the
    // entire pending queue to drain, or a crashed worker's coalesced resource
    // stays stuck under a sustained backlog.
    it("reclaims an expired lease even when other pending work is due", async () => {
      await repo.enqueue(
        enqueue({ coalescingKey: "stuck", priority: 1, runAfter: past(1000) }),
      );
      const stuck = await repo.claimDueJob("crashed-worker", NOW, LEASE_MS);
      expect(stuck?.coalescingKey).toBe("stuck");

      await repo.enqueue(
        enqueue({
          coalescingKey: "backlog",
          priority: 9,
          runAfter: past(500),
        }),
      );

      const later = future(LEASE_MS + 1000);
      const next = await repo.claimDueJob("fresh-worker", later, LEASE_MS);
      expect(next?._id).toBe(stuck?._id);
      expect(next?.leaseOwner).toBe("fresh-worker");
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

    // Load-bearing for running several drain workers in one process: each has
    // its own owner id, and one stopping must not yank a job another is still
    // running. If releaseOwned were not owner-scoped, a rolling shutdown would
    // flip a peer's in-flight job back to pending and it would be reprocessed.
    it("releases only the leaving worker's jobs, not a peer's", async () => {
      await repo.enqueue(enqueue({ coalescingKey: "a", runAfter: past(1000) }));
      await repo.enqueue(enqueue({ coalescingKey: "b", runAfter: past(1000) }));
      const leaving = await repo.claimDueJob("leaving-worker", NOW, LEASE_MS);
      const staying = await repo.claimDueJob("staying-worker", NOW, LEASE_MS);
      expect(leaving).not.toBeNull();
      expect(staying).not.toBeNull();

      expect(await repo.releaseOwned("leaving-worker")).toBe(1);

      const peer = await db
        .collection("jobs")
        .findOne({ _id: staying!._id as never });
      expect(peer?.state).toBe("claimed");
      expect(peer?.leaseOwner).toBe("staying-worker");
      const released = await db
        .collection("jobs")
        .findOne({ _id: leaving!._id as never });
      expect(released?.state).toBe("pending");
      expect(released?.leaseOwner).toBeNull();
    });
  });

  describe("self-heal requeue", () => {
    const NOW = new Date("2026-07-20T12:00:00.000Z");
    const past = (ms: number) => new Date(NOW.getTime() - ms);

    // Enqueue, claim, and fail a job in one step so a test can start directly
    // from state:"failed" without driving a real worker's retry ladder.
    const seedFailed = async (
      overrides: Partial<JobEnqueue> = {},
    ): Promise<SyncJobId> => {
      const job = await repo.enqueue(
        enqueue({ runAfter: past(1000), ...overrides }),
      );
      const claimed = await repo.claimDueJob("worker", NOW, 60_000);
      await repo.fail(claimed!._id, "worker", "retryableTransient");
      return job._id;
    };

    it("lists a failed job whose runAfter is before the cooldown cutoff", async () => {
      const id = await seedFailed({ runAfter: past(60 * 60_000) });
      const candidates = await repo.listFailedForRequeue(
        past(30 * 60_000),
        3,
        100,
      );
      expect(candidates.map((j) => j._id)).toEqual([id]);
    });

    it("excludes a failed job that has not cooled down yet", async () => {
      await seedFailed({ runAfter: past(5 * 60_000) });
      const candidates = await repo.listFailedForRequeue(
        past(30 * 60_000),
        3,
        100,
      );
      expect(candidates).toHaveLength(0);
    });

    it("excludes a failed job at or over the requeue cap", async () => {
      const id = await seedFailed({ runAfter: past(60 * 60_000) });
      // Simulate two prior requeue-then-fail-again cycles.
      for (let cycle = 0; cycle < 2; cycle += 1) {
        await repo.requeue(id, past(50 * 60_000));
        const reclaimed = await repo.claimDueJob("worker", NOW, 60_000);
        await repo.fail(reclaimed!._id, "worker", "retryableTransient");
      }

      const underCap = await repo.listFailedForRequeue(
        past(30 * 60_000),
        2,
        100,
      );
      expect(underCap).toHaveLength(0);
      expect(await repo.countExhaustedFailed(2)).toBe(1);
      expect(await repo.listExhaustedFailed(2)).toEqual([
        expect.objectContaining({
          id,
          failureClass: "retryableTransient",
          requeuedCount: 2,
        }),
      ]);
    });

    it("counts failed and exhausted jobs per connection", async () => {
      const connectionId = objectId() as JobEnqueue["connectionId"];
      const tenantId = objectId() as JobEnqueue["tenantId"];
      const principalId = objectId() as JobEnqueue["principalId"];
      const id = await seedFailed({
        tenantId,
        principalId,
        connectionId,
        runAfter: past(60 * 60_000),
        coalescingKey: `pull:${objectId()}`,
      });
      for (let cycle = 0; cycle < 2; cycle += 1) {
        await repo.requeue(id, past(50 * 60_000));
        const reclaimed = await repo.claimDueJob("worker", NOW, 60_000);
        await repo.fail(reclaimed!._id, "worker", "retryableTransient");
      }
      // A second failed job under the same connection, still under the cap.
      await seedFailed({
        tenantId,
        principalId,
        connectionId,
        runAfter: past(60 * 60_000),
        coalescingKey: `pull:${objectId()}`,
      });

      expect(
        await repo.countFailedByConnection(tenantId, principalId, connectionId),
      ).toBe(2);
      expect(
        await repo.countExhaustedFailedByConnection(
          tenantId,
          principalId,
          connectionId,
          2,
        ),
      ).toBe(1);
      expect(await repo.findByIdUnscoped(id)).toMatchObject({
        _id: id,
        state: "failed",
        requeuedCount: 2,
      });
    });

    it("excludes a permanently classed failure from requeue and exhaustion", async () => {
      await repo.enqueue(enqueue({ runAfter: past(60 * 60_000) }));
      const claimed = await repo.claimDueJob("worker", NOW, 60_000);
      await repo.fail(claimed!._id, "worker", "permanent");

      expect(
        await repo.listFailedForRequeue(past(30 * 60_000), 3, 100),
      ).toHaveLength(0);
      expect(await repo.countExhaustedFailed(0)).toBe(0);
    });

    it("requeue resets a failed job to pending with a fresh attempt budget", async () => {
      const id = await seedFailed({ runAfter: past(60 * 60_000) });
      expect(await repo.requeue(id, NOW)).toBe(true);

      const after = await db.collection("jobs").findOne({ _id: id as never });
      expect(after?.state).toBe("pending");
      expect(after?.attempt).toBe(0);
      expect(after?.leaseOwner).toBeNull();
      expect(after?.failureClass).toBeNull();
      expect(after?.runAfter).toEqual(NOW);
      expect(after?.requeuedCount).toBe(1);
    });

    it("does not requeue a job that is not currently failed", async () => {
      const job = await repo.enqueue(enqueue({ runAfter: past(1000) }));
      expect(await repo.requeue(job._id, NOW)).toBe(false);
    });

    it("finds the oldest overdue job for a connection, including a failed one", async () => {
      const connectionId = objectId() as JobEnqueue["connectionId"];
      const tenantId = objectId() as JobEnqueue["tenantId"];
      const principalId = objectId() as JobEnqueue["principalId"];
      const failed = await repo.enqueue(
        enqueue({
          tenantId,
          principalId,
          connectionId,
          runAfter: past(60 * 60_000),
          coalescingKey: "pull:failed-resource",
        }),
      );
      const claimed = await repo.claimDueJob("worker", NOW, 60_000);
      await repo.fail(claimed!._id, "worker", "retryableTransient");
      // A pending job on the same connection, due more recently — the failed
      // job is still older and should win.
      await repo.enqueue(
        enqueue({
          tenantId,
          principalId,
          connectionId,
          runAfter: past(5 * 60_000),
          coalescingKey: "pull:pending-resource",
        }),
      );

      const oldest = await repo.findOldestOverdueByConnection(
        tenantId,
        principalId,
        connectionId,
        NOW,
      );
      expect(oldest?.runAfter).toEqual(failed.runAfter);
      expect(oldest?.failureClass).toBe("retryableTransient");
    });

    it("reports no overdue work for a connection with only healthy pending jobs", async () => {
      const connectionId = objectId() as JobEnqueue["connectionId"];
      const tenantId = objectId() as JobEnqueue["tenantId"];
      const principalId = objectId() as JobEnqueue["principalId"];
      await repo.enqueue(
        enqueue({
          tenantId,
          principalId,
          connectionId,
          runAfter: new Date(NOW.getTime() + 60_000), // not due yet
        }),
      );

      expect(
        await repo.findOldestOverdueByConnection(
          tenantId,
          principalId,
          connectionId,
          NOW,
        ),
      ).toBeNull();
    });
  });

  // Plan pins for the Atlas Query Targeting residual after #2473: idle claims
  // must not walk pending-not-due backoff jobs, and connection overdue lookups
  // must not COLLSCAN the jobs collection.
  describe("index plans", () => {
    const NOW = new Date("2026-07-20T12:00:00.000Z");

    it("due-pending claim filter is served by state_runafter_priority", async () => {
      // Seed many future-backoff jobs so a wrong index order would examine them.
      for (let i = 0; i < 20; i += 1) {
        await repo.enqueue(
          enqueue({
            coalescingKey: `backoff:${i}`,
            runAfter: new Date(NOW.getTime() + (i + 1) * 60_000),
          }),
        );
      }

      const plan = await db
        .collection("jobs")
        .find({ state: "pending", runAfter: { $lte: NOW } })
        .sort({ priority: -1, runAfter: 1 })
        .explain("executionStats");
      const winning = JSON.stringify(plan);
      expect(winning).toContain("state_runafter_priority");
      expect(winning).not.toContain("COLLSCAN");
      // With runAfter leading after state, future backoff rows are not examined.
      expect(
        plan.executionStats?.totalKeysExamined ?? Infinity,
      ).toBeLessThanOrEqual(1);
    });

    it("connection overdue filter is served by connection_runafter", async () => {
      const connectionId = objectId();
      await repo.enqueue(
        enqueue({
          connectionId: connectionId as JobEnqueue["connectionId"],
          runAfter: NOW,
        }),
      );
      // Noise on other connections.
      for (let i = 0; i < 10; i += 1) {
        await repo.enqueue(
          enqueue({
            coalescingKey: `other:${i}`,
            runAfter: NOW,
          }),
        );
      }

      const plan = await db
        .collection("jobs")
        .find({
          connectionId,
          $or: [
            { state: "pending", runAfter: { $lte: NOW } },
            { state: "claimed", leaseExpiresAt: { $lt: NOW } },
            { state: "failed" },
          ],
        })
        .sort({ runAfter: 1 })
        .explain("queryPlanner");
      const winning = JSON.stringify(plan);
      expect(winning).toContain("connection_runafter");
      expect(winning).not.toContain("COLLSCAN");
    });
  });
});
