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
} from "@sync/storage/job.record";

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
}
