import { type Collection, type Db, ObjectId } from "mongodb";
import {
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
  // lease has expired (the previous owner crashed). Because findOneAndUpdate is
  // a single atomic operation, two workers racing for the same job can never
  // both win — the loser simply gets the next job or null. Returns null when no
  // job is due.
  async claimDueJob(
    owner: string,
    now: Date,
    leaseDurationMs: number,
  ): Promise<JobRecord | null> {
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
    const result = await this.collection.findOneAndUpdate(
      {
        $or: [
          { state: "pending", runAfter: { $lte: now } },
          { state: "claimed", leaseExpiresAt: { $lt: now } },
        ],
      },
      {
        $set: { state: "claimed", leaseOwner: owner, leaseExpiresAt },
        $inc: { attempt: 1 },
        $currentDate: { updatedAt: true },
      },
      { sort: { priority: -1, runAfter: 1 }, returnDocument: "after" },
    );
    return result ? JobRecordSchema.parse(result) : null;
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

  // Hard-delete every job for a principal (account deletion).
  async deleteByPrincipal(
    tenantId: TenantId,
    principalId: PrincipalId,
  ): Promise<number> {
    const result = await this.collection.deleteMany({ tenantId, principalId });
    return result.deletedCount;
  }
}
