import { type Collection, type Db, ObjectId } from "mongodb";
import { type SyncCommandOutcome } from "@core/types/sync/command.contracts";
import {
  type PrincipalId,
  type SyncCommandId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type CommandRecord,
  CommandRecordSchema,
  type CommandSubmit,
  CommandSubmitSchema,
} from "@sync/storage/contracts/command.contracts";

// Repository for `commands`. Submitting is idempotent on
// (tenant, principal, idempotencyKey): a retried submission returns the
// existing command rather than creating a duplicate, so an interrupted or
// replayed submit is safe. Queries are scoped to the owning tenant/principal.
export class CommandRepository {
  private readonly collection: Collection<CommandRecord>;

  constructor(db: Db) {
    this.collection = db.collection<CommandRecord>(SYNC_COLLECTIONS.commands);
  }

  // Insert the command if its idempotency key is new; otherwise return the
  // command already stored for that key unchanged. New commands start pending
  // with a zero attempt count.
  async submit(input: CommandSubmit): Promise<CommandRecord> {
    const fields = CommandSubmitSchema.parse(input);
    const now = new Date();

    const result = await this.collection.findOneAndUpdate(
      {
        tenantId: fields.tenantId,
        principalId: fields.principalId,
        idempotencyKey: fields.idempotencyKey,
      },
      {
        // Everything is set-on-insert: a repeated submit must not overwrite an
        // in-flight command's outcome or attempt count.
        $setOnInsert: {
          _id: new ObjectId().toHexString() as SyncCommandId,
          eventId: fields.eventId,
          input: fields.input,
          expectedVersion: fields.expectedVersion,
          outcome: { state: "pending" } as SyncCommandOutcome,
          attemptCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!result) throw new Error("Submit did not return a command record");
    return CommandRecordSchema.parse(result);
  }

  async findById(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: SyncCommandId,
  ): Promise<CommandRecord | null> {
    const record = await this.collection.findOne({
      _id: id,
      tenantId,
      principalId,
    });
    return record ? CommandRecordSchema.parse(record) : null;
  }

  // Record a state transition (pending -> applying -> confirmed/failed/...) and
  // the current attempt count. Returns the updated record, or null if the
  // command doesn't exist for this principal.
  async updateOutcome(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: SyncCommandId,
    outcome: SyncCommandOutcome,
    attemptCount: number,
  ): Promise<CommandRecord | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id, tenantId, principalId },
      { $set: { outcome, attemptCount, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return result ? CommandRecordSchema.parse(result) : null;
  }

  // Commands still working (not in a terminal state), oldest first — the queue
  // a worker drains. Terminal states are confirmed, failed, and cancelled.
  async listNonterminal(
    tenantId: TenantId,
    principalId: PrincipalId,
    limit: number,
  ): Promise<CommandRecord[]> {
    const records = await this.collection
      .find({
        tenantId,
        principalId,
        "outcome.state": { $in: ["pending", "applying", "reconciling"] },
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();
    return records.map((r) => CommandRecordSchema.parse(r));
  }
}
