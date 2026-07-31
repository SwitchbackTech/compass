import { type Collection, type Db, ObjectId } from "mongodb";
import {
  type ConnectionId,
  type PrincipalId,
  type SyncJobId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type JobEnqueue,
  JobEnqueueSchema,
  type JobRecord,
  JobRecordSchema,
} from "@sync/storage/contracts/job.contracts";

export type ExhaustedFailedJob = {
  id: SyncJobId;
  coalescingKey: string;
  connectionId: ConnectionId;
  failureClass: Exclude<JobRecord["failureClass"], null>;
  requeuedCount: number;
  updatedAt: Date;
};

// Repository for `jobs`. Enqueue coalesces on a unique key so repeated
// notifications for the same resource collapse into one pending job instead of
// an unbounded queue. Terminal jobs are removed so a later notification can
// re-enqueue the same coalescing key.
export class JobRepository {
  private readonly collection: Collection<JobRecord>;

  constructor(db: Db) {
    this.collection = db.collection<JobRecord>(SYNC_COLLECTIONS.jobs);
  }

  // Create the job if its coalescing key is new; otherwise return the existing
  // job unchanged. A burst of equivalent notifications therefore yields one
  // job, not many.
  async enqueue(input: JobEnqueue): Promise<JobRecord> {
    const fields = JobEnqueueSchema.parse(input);
    const now = new Date();

    const result = await this.collection.findOneAndUpdate(
      { coalescingKey: fields.coalescingKey },
      {
        $setOnInsert: {
          _id: new ObjectId().toHexString() as SyncJobId,
          tenantId: fields.tenantId,
          principalId: fields.principalId,
          connectionId: fields.connectionId,
          resourceId: fields.resourceId,
          commandId: fields.commandId,
          kind: fields.kind,
          priority: fields.priority,
          state: "pending",
          runAfter: fields.runAfter,
          attempt: 0,
          coalescingKey: fields.coalescingKey,
          leaseOwner: null,
          leaseExpiresAt: null,
          failureClass: null,
          requeuedCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!result) throw new Error("Enqueue did not return a job record");
    return JobRecordSchema.parse(result);
  }

  async findById(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: SyncJobId,
  ): Promise<JobRecord | null> {
    const record = await this.collection.findOne({
      _id: id,
      tenantId,
      principalId,
    });
    return record ? JobRecordSchema.parse(record) : null;
  }

  // Remove a completed job. Deleting by _id AND coalescingKey guarantees we
  // only remove the job we finished, never a fresh one another worker may have
  // enqueued under the same key after ours completed.
  async remove(id: SyncJobId, coalescingKey: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id, coalescingKey });
    return result.deletedCount === 1;
  }

  // Atomically claim the highest-priority due job for one worker. A job is due
  // when it's pending and its runAfter has passed, OR it's claimed but its
  // lease has expired (the previous owner crashed). The two arms are claimed
  // separately so each can use its own index (state_runafter_priority /
  // lease_expiry) — a single $or + sort forced the planner to walk every
  // pending-not-due backoff job on every idle poll. Expired-lease reclaim
  // runs FIRST so a sustained pending backlog cannot starve crash recovery
  // (a coalesced resource stuck in claimed-with-expired-lease would otherwise
  // never get a fresh pending row). Within each arm, priority then age wins.
  // findOneAndUpdate stays atomic per arm, so two workers still never both
  // win the same job. Returns null when no job is due.
  async claimDueJob(
    owner: string,
    now: Date,
    leaseDurationMs: number,
  ): Promise<JobRecord | null> {
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
    const claimUpdate = {
      $set: { state: "claimed" as const, leaseOwner: owner, leaseExpiresAt },
      $inc: { attempt: 1 },
      $currentDate: { updatedAt: true as const },
    };
    const claimOpts = {
      sort: { priority: -1 as const, runAfter: 1 as const },
      returnDocument: "after" as const,
    };

    for (const filter of [
      { state: "claimed" as const, leaseExpiresAt: { $lt: now } },
      { state: "pending" as const, runAfter: { $lte: now } },
    ]) {
      const claimed = await this.collection.findOneAndUpdate(
        filter,
        claimUpdate,
        claimOpts,
      );
      if (claimed) return JobRecordSchema.parse(claimed);
    }
    return null;
  }

  // Extend the lease while a worker is still processing. Only the current owner
  // can heartbeat; a job reclaimed by someone else returns false.
  async heartbeat(
    id: SyncJobId,
    owner: string,
    now: Date,
    leaseDurationMs: number,
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, leaseOwner: owner, state: "claimed" },
      {
        $set: { leaseExpiresAt: new Date(now.getTime() + leaseDurationMs) },
        $currentDate: { updatedAt: true },
      },
    );
    return result.modifiedCount === 1;
  }

  // Finish a job the worker owns. Scoped to the owner so a job reclaimed after a
  // stale lease isn't deleted out from under its new owner.
  async complete(id: SyncJobId, owner: string): Promise<boolean> {
    const result = await this.collection.deleteOne({
      _id: id,
      leaseOwner: owner,
    });
    return result.deletedCount === 1;
  }

  // Reschedule a job the worker owns for a later retry, returning it to the
  // pending pool and releasing the lease.
  async scheduleRetry(
    id: SyncJobId,
    owner: string,
    runAfter: Date,
    failureClass: JobRecord["failureClass"],
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, leaseOwner: owner },
      {
        $set: {
          state: "pending",
          runAfter,
          leaseOwner: null,
          leaseExpiresAt: null,
          failureClass,
        },
        $currentDate: { updatedAt: true },
      },
    );
    return result.modifiedCount === 1;
  }

  // Mark a job the worker owns as a permanent failure needing attention.
  async fail(
    id: SyncJobId,
    owner: string,
    failureClass: JobRecord["failureClass"],
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, leaseOwner: owner },
      {
        $set: {
          state: "failed",
          leaseOwner: null,
          leaseExpiresAt: null,
          failureClass,
        },
        $currentDate: { updatedAt: true },
      },
    );
    return result.modifiedCount === 1;
  }

  // On graceful shutdown, return every job this worker still holds to the
  // pending pool so another worker (or the restarted process) picks them up
  // immediately instead of waiting for the lease to expire.
  //
  // Precondition: the caller must drain all in-flight job handlers for this
  // worker BEFORE calling releaseOwned. Running it concurrently with an
  // in-flight complete()/scheduleRetry() can flip a just-finished job back to
  // pending (the completion then no-ops because the lease is cleared), causing
  // another worker to reprocess already-done work.
  async releaseOwned(owner: string): Promise<number> {
    const result = await this.collection.updateMany(
      { leaseOwner: owner, state: "claimed" },
      {
        $set: { state: "pending", leaseOwner: null, leaseExpiresAt: null },
        $currentDate: { updatedAt: true },
      },
    );
    return result.modifiedCount;
  }

  // Failed jobs the self-heal sweep should give a fresh retry ladder: still
  // failed (a concurrent operator/reconnect action may have moved it on),
  // last due before the sweep's cooldown cutoff (`before`), not a permanently
  // classed failure (retrying that can never help), and under the requeue
  // cap. Gated on `runAfter` rather than `updatedAt` — the latter is set via
  // $currentDate (real wall-clock, not the injected `now` used everywhere
  // else) and is pure audit metadata, never a field business logic reads.
  // Oldest-due-first so a long-wedged job is healed before a recently-failed
  // one.
  async listFailedForRequeue(
    before: Date,
    maxRequeues: number,
    limit: number,
  ): Promise<JobRecord[]> {
    const rows = await this.collection
      .find({
        state: "failed",
        failureClass: { $ne: "permanent" },
        requeuedCount: { $lt: maxRequeues },
        runAfter: { $lte: before },
      })
      .sort({ runAfter: 1 })
      .limit(limit)
      .toArray();
    return rows.map((row) => JobRecordSchema.parse(row));
  }

  // Give a failed job a fresh attempt budget and return it to the pending
  // pool, bumping requeuedCount (NOT reset by this — that is the sweep's
  // budget, distinct from the per-worker attempt count this clears). Scoped
  // to state:"failed" so a job an operator or reconnect already moved on is
  // left alone. Reusing the same _id/coalescingKey in place, rather than
  // remove+enqueue, means the sweep never has to race the coalescing key's
  // $setOnInsert uniqueness against a fresh notification for the same
  // resource.
  async requeue(id: SyncJobId, now: Date): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, state: "failed" },
      {
        $set: {
          state: "pending",
          runAfter: now,
          attempt: 0,
          leaseOwner: null,
          leaseExpiresAt: null,
          failureClass: null,
        },
        $inc: { requeuedCount: 1 },
        $currentDate: { updatedAt: true },
      },
    );
    return result.modifiedCount === 1;
  }

  // Failed jobs that exhausted the self-heal requeue budget and re-failed —
  // the sweep will not touch them again; an operator must. Used to drive a
  // loud, recurring alert rather than a silent terminal state.
  async countExhaustedFailed(maxRequeues: number): Promise<number> {
    return this.collection.countDocuments({
      state: "failed",
      failureClass: { $ne: "permanent" },
      requeuedCount: { $gte: maxRequeues },
    });
  }

  // Same filter as countExhaustedFailed, returning the rows an operator needs
  // to clear or requeue (bounded so the sweep log stays readable).
  async listExhaustedFailed(
    maxRequeues: number,
    limit = 50,
  ): Promise<ExhaustedFailedJob[]> {
    const rows = await this.collection
      .find({
        state: "failed",
        failureClass: { $ne: "permanent" },
        requeuedCount: { $gte: maxRequeues },
      })
      .sort({ updatedAt: 1 })
      .limit(limit)
      .project({
        _id: 1,
        coalescingKey: 1,
        connectionId: 1,
        failureClass: 1,
        requeuedCount: 1,
        updatedAt: 1,
      })
      .toArray();

    return rows.map((row) => ({
      id: row._id as SyncJobId,
      coalescingKey: String(row["coalescingKey"]),
      connectionId: row["connectionId"] as ConnectionId,
      failureClass: (row["failureClass"] ?? "retryableTransient") as Exclude<
        JobRecord["failureClass"],
        null
      >,
      requeuedCount: Number(row["requeuedCount"] ?? 0),
      updatedAt:
        row["updatedAt"] instanceof Date ? row["updatedAt"] : new Date(0),
    }));
  }

  async countFailedByConnection(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
  ): Promise<number> {
    return this.collection.countDocuments({
      tenantId,
      principalId,
      connectionId,
      state: "failed",
    });
  }

  async countExhaustedFailedByConnection(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
    maxRequeues: number,
  ): Promise<number> {
    return this.collection.countDocuments({
      tenantId,
      principalId,
      connectionId,
      state: "failed",
      failureClass: { $ne: "permanent" },
      requeuedCount: { $gte: maxRequeues },
    });
  }

  // Operator tooling only — looks up by id without tenant/principal scope.
  // Prefer findById(tenantId, principalId, id) for request-path reads.
  async findByIdUnscoped(id: SyncJobId): Promise<JobRecord | null> {
    const row = await this.collection.findOne({ _id: id });
    return row ? JobRecordSchema.parse(row) : null;
  }

  // The oldest piece of overdue work for one connection, if any: a pending
  // job past its runAfter, a claimed job whose lease lapsed, or ANY failed
  // job (a terminal failure is always overdue — nothing will run it again
  // without the self-heal sweep or an operator). Feeds
  // ConnectionStateEvidence.oldestDueWorkAt, which was previously wired to a
  // hardcoded null — a wedged failed job was invisible to the connection's
  // own health state (2026-07-30: every signal green with jobs stuck ~25h).
  async findOldestOverdueByConnection(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
    now: Date,
  ): Promise<{
    runAfter: Date;
    failureClass: JobRecord["failureClass"];
  } | null> {
    const result = await this.collection.findOne(
      {
        tenantId,
        principalId,
        connectionId,
        $or: [
          { state: "pending", runAfter: { $lte: now } },
          { state: "claimed", leaseExpiresAt: { $lt: now } },
          { state: "failed" },
        ],
      },
      {
        sort: { runAfter: 1 },
        projection: { runAfter: 1, failureClass: 1 },
      },
    );
    if (!result || !(result["runAfter"] instanceof Date)) return null;
    return {
      runAfter: result["runAfter"],
      failureClass: result["failureClass"] ?? null,
    };
  }

  // Outstanding work for one connection (support diagnostics / S45).
  async countOutstandingByConnection(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
  ): Promise<number> {
    return this.collection.countDocuments({
      tenantId,
      principalId,
      connectionId,
      state: { $in: ["pending", "claimed"] },
    });
  }

  // Hard-delete every job for one connection (post-disconnect retention).
  async deleteByConnection(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
  ): Promise<number> {
    const result = await this.collection.deleteMany({
      tenantId,
      principalId,
      connectionId,
    });
    return result.deletedCount;
  }

  // Hard-delete every job for a principal (account deletion).
  async deleteByPrincipal(
    tenantId: TenantId,
    principalId: PrincipalId,
  ): Promise<number> {
    const result = await this.collection.deleteMany({ tenantId, principalId });
    return result.deletedCount;
  }
}
