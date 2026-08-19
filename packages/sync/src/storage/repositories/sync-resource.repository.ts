import { type Collection, type Db, ObjectId } from "mongodb";
import { type SyncEventCalendarId } from "@core/types/sync/event.contracts";
import {
  type ConnectionId,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type ResourceBootstrapState,
  type SyncResourceRecord,
  SyncResourceRecordSchema,
  type SyncResourceUpsert,
  SyncResourceUpsertSchema,
} from "@sync/storage/contracts/sync-resource.contracts";

// Shared tail for the global sweep finders below: drop resources whose
// connection has no stored credential. Such a resource can never succeed no
// matter how many sweeps retry it — reconnect is what resumes it
// (registerConnection's own calendarListSync enqueue), not a sweep. Excluding
// at the query level, rather than relying on the lastAttemptAt rotation,
// matters because the rotation only helps AFTER a resource's first attempt:
// the whole never-attempted population (dead-credential resources alongside
// genuinely healthy new ones) ties at lastAttemptAt: null, and Mongo's
// tie-break across that tie is not random — it reproducibly favored the
// dead-credential cohort (2026-07-29: an isolated post-rotation-fix sweep
// batch still selected 100 resources with only 1 holding a credential).
//
// listExpiringSubscriptions deliberately does NOT use this: it only selects
// resources that already hold a live channel, which a credential-less
// connection cannot renew into existence in the first place, and a renewal
// attempt on one settles as a credential drop rather than burning a ladder.
const EXCLUDE_CREDENTIALLESS_STAGES = [
  {
    $lookup: {
      from: SYNC_COLLECTIONS.credentials,
      localField: "connectionId",
      foreignField: "_id",
      as: "_credential",
    },
  },
  { $match: { "_credential.0": { $exists: true } } },
  { $project: { _credential: 0 } },
];

interface SubscriptionInput {
  subscriptionId: string;
  subscriptionResourceId: string;
  subscriptionToken: string;
  subscriptionExpiresAt: Date;
}

// Repository for `sync_resources`. Each resource is created once per
// (connection, resourceKind, calendar) and then advanced as sync progresses.
// The incremental cursor is only moved after a whole batch succeeds; the page
// cursor holds mid-batch progress so an interrupted pull resumes rather than
// restarts.
export class SyncResourceRepository {
  private readonly collection: Collection<SyncResourceRecord>;

  constructor(db: Db) {
    this.collection = db.collection<SyncResourceRecord>(
      SYNC_COLLECTIONS.syncResources,
    );
  }

  // Owner-scoped single-document $set; every simple mutator below is one of
  // these with a different payload. Bumps updatedAt on every write.
  async #patch(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    fields: Partial<SyncResourceRecord>,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id, tenantId, principalId },
      { $set: { ...fields, updatedAt: new Date() } },
    );
  }

  // Shared shape of the global sweep finders: match, drop credential-less
  // connections, sort deterministically, bound, parse.
  async #listForSweep(
    match: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    limit: number,
  ): Promise<SyncResourceRecord[]> {
    const records = await this.collection
      .aggregate<SyncResourceRecord>([
        { $match: match },
        ...EXCLUDE_CREDENTIALLESS_STAGES,
        { $sort: sort },
        { $limit: limit },
      ])
      .toArray();
    return records.map((r) => SyncResourceRecordSchema.parse(r));
  }

  async ensure(input: SyncResourceUpsert): Promise<SyncResourceRecord> {
    const fields = SyncResourceUpsertSchema.parse(input);
    const now = new Date();

    const result = await this.collection.findOneAndUpdate(
      {
        connectionId: fields.connectionId,
        resourceKind: fields.resourceKind,
        calendarId: fields.calendarId,
      },
      {
        $setOnInsert: {
          _id: new ObjectId().toHexString(),
          tenantId: fields.tenantId,
          principalId: fields.principalId,
          syncCursor: null,
          pageCursor: null,
          importGeneration: 0,
          activeGeneration: 0,
          lastAttemptAt: null,
          lastSuccessAt: null,
          lastReadFailureAt: null,
          lastReadFailureDetail: null,
          watchUnsupportedAt: null,
          bootstrapState:
            fields.resourceKind === "events" ? "importing" : "ready",
          subscriptionId: null,
          subscriptionResourceId: null,
          subscriptionToken: null,
          subscriptionExpiresAt: null,
          changeNotifiedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!result) throw new Error("Ensure did not return a sync resource");
    return SyncResourceRecordSchema.parse(result);
  }

  async markAttempt(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    at: Date,
  ): Promise<void> {
    await this.#patch(tenantId, principalId, id, { lastAttemptAt: at });
  }

  // Save mid-batch page progress without moving the incremental cursor.
  async setPageCheckpoint(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    pageCursor: string,
  ): Promise<void> {
    await this.#patch(tenantId, principalId, id, { pageCursor });
  }

  // Record a successful read pass. When `syncCursor` is a string, store it and
  // clear the mid-batch page checkpoint; when null, leave the stored cursor
  // alone (calendarList rediscovery may succeed without a next sync token and
  // intentionally full-list next pass). Either way clears any durable
  // read-failure marker so connection health stops reporting
  // delayed/providerErrors without an operator clearing anything by hand.
  async advanceCursor(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    syncCursor: string | null,
    succeededAt: Date,
  ): Promise<void> {
    await this.#patch(tenantId, principalId, id, {
      ...(syncCursor === null ? {} : { syncCursor, pageCursor: null }),
      lastSuccessAt: succeededAt,
      lastReadFailureAt: null,
      lastReadFailureDetail: null,
    });
  }

  // Record that the provider DURABLY rejected reads for this resource (a 4xx
  // retrying cannot fix). The job that hit it is settled and removed rather than
  // left to burn its retry ladder, so this marker is the only evidence left —
  // connection health reads it, and a later successful pass clears it. Keeps the
  // first failure's timestamp on repeat failures so health can show how long the
  // calendar has been dead, but always refreshes the detail.
  async markReadFailure(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    at: Date,
    detail: string,
  ): Promise<void> {
    await this.collection.updateOne({ _id: id, tenantId, principalId }, [
      {
        $set: {
          // $ifNull keeps the FIRST failure's timestamp across repeats (a row
          // written before this field existed reads as null and takes `at`).
          lastReadFailureAt: { $ifNull: ["$lastReadFailureAt", at] },
          lastReadFailureDetail: detail,
          updatedAt: new Date(),
        },
      },
    ]);
  }

  // Record that the provider reported a change for this resource. Always
  // overwrites: the newest notification is the one a pull must observe, and the
  // pull's compare-and-clear below keys off exactly this value.
  async markChangeNotified(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    at: Date,
  ): Promise<void> {
    await this.#patch(tenantId, principalId, id, { changeNotifiedAt: at });
  }

  // Clear the change marker a pull has now served, but only if it still holds
  // `expected` — the value read when that pull started. Returns false when the
  // marker moved mid-pull, meaning a notification arrived after the pull had
  // already read the provider and the caller must pull again.
  //
  // `expected` may be null (no pending change at pull start); a notification
  // landing during that pull still moves it off null and fails the match.
  // Matched-not-modified is the null -> null case, which is unchanged.
  async clearChangeNotifiedIfUnchanged(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    expected: Date | null,
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, tenantId, principalId, changeNotifiedAt: expected },
      { $set: { changeNotifiedAt: null, updatedAt: new Date() } },
    );
    return result.matchedCount === 1;
  }

  // Advance first-connection readiness only after the caller has completed a
  // durable boundary (initial import, watch setup, or the post-watch pull).
  async setBootstrapState(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    bootstrapState: ResourceBootstrapState,
  ): Promise<void> {
    await this.#patch(tenantId, principalId, id, { bootstrapState });
  }

  async updateSubscription(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    subscription: SubscriptionInput,
  ): Promise<void> {
    await this.#patch(tenantId, principalId, id, {
      ...subscription,
      // A watch just succeeded, so any earlier unsupported verdict is stale
      // by definition.
      watchUnsupportedAt: null,
    });
  }

  // Record the provider's terminal refusal to open a push channel for this
  // resource (maintainSubscription's "unsupported" outcome). While set, the
  // pull path stops re-attempting a watch every cycle; cleared by the daily
  // calendar-list full pass (clearWatchUnsupportedByConnection) or by a
  // successful watch (updateSubscription).
  async markWatchUnsupported(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    at: Date,
  ): Promise<void> {
    await this.#patch(tenantId, principalId, id, { watchUnsupportedAt: at });
  }

  // Give every unwatchable-marked resource on a connection one fresh watch
  // attempt. Called from the calendar-list FULL discovery pass, which the
  // rediscovery sweep forces daily — so a calendar the provider starts
  // supporting is retried at that cadence rather than never (or on every
  // pull, which was the pre-marker wart).
  async clearWatchUnsupportedByConnection(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
  ): Promise<void> {
    await this.collection.updateMany(
      {
        tenantId,
        principalId,
        connectionId,
        watchUnsupportedAt: { $ne: null },
      },
      { $set: { watchUnsupportedAt: null, updatedAt: new Date() } },
    );
  }

  async clearSubscription(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
  ): Promise<void> {
    await this.#patch(tenantId, principalId, id, {
      subscriptionId: null,
      subscriptionResourceId: null,
      subscriptionToken: null,
      subscriptionExpiresAt: null,
    });
  }

  // Find the resource a provider push channel belongs to. Keyed on the channel
  // (subscription) id alone — an inbound callback carries no tenant/principal,
  // and the channel id is unique — so authenticity is then checked against the
  // stored token by verifyNotification, not by this lookup.
  async findBySubscriptionId(
    subscriptionId: string,
  ): Promise<SyncResourceRecord | null> {
    const record = await this.collection.findOne({ subscriptionId });
    return record ? SyncResourceRecordSchema.parse(record) : null;
  }

  // Begin a fresh import generation for a non-destructive repair. The old
  // generation's data stays queryable until the replacement completes.
  async startNewGeneration(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
  ): Promise<number> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id, tenantId, principalId },
      { $inc: { importGeneration: 1 }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw new Error("startNewGeneration: resource not found");
    return SyncResourceRecordSchema.parse(result).importGeneration;
  }

  // Serve reads from the generation a repair just finished building. The flip is
  // a single field update, so reads switch from the old generation to the new
  // one atomically; the old generation's rows are cleaned up afterward.
  async activateGeneration(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    generation: number,
  ): Promise<void> {
    await this.#patch(tenantId, principalId, id, {
      activeGeneration: generation,
    });
  }

  // The active generation to read for each of the given event calendars. A
  // calendar with no events resource yet (a cloud-only calendar, or one not
  // imported) is absent from the result; callers read generation 0 for those.
  async activeGenerationByCalendar(
    tenantId: TenantId,
    principalId: PrincipalId,
    calendarIds: readonly SyncEventCalendarId[],
  ): Promise<Map<SyncEventCalendarId, number>> {
    const freshness = await this.listEventResourceFreshnessByCalendar(
      tenantId,
      principalId,
      calendarIds,
    );
    return new Map(
      [...freshness].map(([calendarId, r]) => [calendarId, r.activeGeneration]),
    );
  }

  // The events resources backing the given calendars, projected to what a busy /
  // availability query needs: the generation to read, the owning connection, and
  // the freshness watermark. A calendar with no events resource yet is simply
  // absent from the result (the caller reports it missing).
  async listEventResourceFreshnessByCalendar(
    tenantId: TenantId,
    principalId: PrincipalId,
    calendarIds: readonly SyncEventCalendarId[],
  ): Promise<
    Map<
      SyncEventCalendarId,
      {
        connectionId: ConnectionId;
        activeGeneration: number;
        lastSuccessAt: Date | null;
      }
    >
  > {
    const records = await this.collection
      .find({
        tenantId,
        principalId,
        resourceKind: "events",
        calendarId: { $in: [...calendarIds] },
      })
      .project<{
        calendarId: SyncEventCalendarId;
        connectionId: ConnectionId;
        activeGeneration: number;
        lastSuccessAt: Date | null;
      }>({
        calendarId: 1,
        connectionId: 1,
        activeGeneration: 1,
        lastSuccessAt: 1,
      })
      .toArray();
    return new Map(
      records.map((r) => [
        r.calendarId,
        {
          connectionId: r.connectionId,
          activeGeneration: r.activeGeneration,
          lastSuccessAt: r.lastSuccessAt,
        },
      ]),
    );
  }

  async findById(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
  ): Promise<SyncResourceRecord | null> {
    const record = await this.collection.findOne({
      _id: id,
      tenantId,
      principalId,
    });
    return record ? SyncResourceRecordSchema.parse(record) : null;
  }

  async listByConnection(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
  ): Promise<SyncResourceRecord[]> {
    const records = await this.collection
      .find({ tenantId, principalId, connectionId })
      .toArray();
    return records.map((r) => SyncResourceRecordSchema.parse(r));
  }

  // Events resources owned by the signed principal — input for a user-
  // triggered refresh (enqueue one incrementalPull per resource). Bounded so a
  // pathological principal cannot enqueue an unbounded refresh burst.
  async listEventsByPrincipal(
    tenantId: TenantId,
    principalId: PrincipalId,
    limit = 200,
  ): Promise<SyncResourceRecord[]> {
    const records = await this.collection
      .find({ tenantId, principalId, resourceKind: "events" })
      .limit(limit)
      .toArray();
    return records.map((r) => SyncResourceRecordSchema.parse(r));
  }

  // Events resources whose last successful sync is older than `before` (or which
  // never succeeded), oldest first, bounded. This is the reconcile sweep's input
  // — a missed-webhook fallback for connections that CAN still authenticate — so
  // it is a GLOBAL scan across owners, not owner-scoped: each returned resource
  // carries its own (tenantId, principalId) for the job the caller enqueues. A
  // never-synced resource (lastSuccessAt null) sorts first so bootstrapping a
  // new calendar is not starved by the stale ones. Uses the
  // resource_last_success index.
  async listStaleEvents(
    before: Date,
    limit: number,
  ): Promise<SyncResourceRecord[]> {
    // Round-robin by ATTEMPT, not success: never-attempted first (null sorts
    // lowest), then least-recently-attempted, so a resource that fails without
    // succeeding still rotates to the back after each try rather than
    // re-winning every sweep. The pull stamps lastAttemptAt before it can
    // fail, so this holds even on failure.
    return this.#listForSweep(
      {
        resourceKind: "events",
        $or: [{ lastSuccessAt: { $lt: before } }, { lastSuccessAt: null }],
      },
      { lastAttemptAt: 1, lastSuccessAt: 1 },
      limit,
    );
  }

  // Events resources whose bootstrap chain has stalled: not yet "ready" and
  // untouched since `before`. This is the bootstrap-recovery sweep's input — the
  // self-heal for a lost chain link (a job dropped on a durable failure with no
  // followup, or any other way the importing -> watching -> catchingUp -> ready
  // handoff loses its thread without ever settling into a retryable state).
  // Ordinary in-progress bootstrapping resources are excluded by the `before`
  // cutoff itself: a resource whose chain is alive keeps advancing updatedAt on
  // every step, so only a genuinely stuck one goes quiet long enough to match.
  // Same GLOBAL scan + credential-exclusion shape as listStaleEvents, for the
  // same reason (2026-07-29 dead-credential tie-break bias) - uses the
  // resource_bootstrap_stalled index.
  async listStalledBootstraps(
    before: Date,
    limit: number,
  ): Promise<SyncResourceRecord[]> {
    return this.#listForSweep(
      {
        resourceKind: "events",
        bootstrapState: { $ne: "ready" },
        updatedAt: { $lt: before },
      },
      { updatedAt: 1 },
      limit,
    );
  }

  // Resources whose push subscription expires before `before` (soonest
  // first, bounded). Events channels and the connection's calendar-list
  // channel share this sweep. Only resources that ALREADY hold a channel are
  // returned; a resource with no subscription is bootstrapped by the import
  // (events) or calendarListSync (calendar list) followup, not here.
  async listExpiringSubscriptions(
    before: Date,
    limit: number,
  ): Promise<SyncResourceRecord[]> {
    const records = await this.collection
      .find({
        resourceKind: { $in: ["events", "calendarList"] },
        subscriptionId: { $ne: null },
        subscriptionExpiresAt: { $lt: before },
      })
      .sort({ subscriptionExpiresAt: 1 })
      .limit(limit)
      .toArray();
    return records.map((r) => SyncResourceRecordSchema.parse(r));
  }

  // calendarList resources whose last successful discovery is older than
  // `before` (or which never succeeded), rotated oldest-attempt-first, bounded.
  // This is the calendar-list rediscovery sweep's input — the periodic re-run
  // that catches a calendar deleted or unshared at the provider, since
  // calendarListSync otherwise only ever runs once, at connect. Same GLOBAL
  // scan + credential-exclusion shape as listStaleEvents, for the same reason
  // (2026-07-29 dead-credential tie-break bias) - uses the resource_last_success
  // / resource_last_attempt indexes, which already lead with resourceKind so no
  // new index is needed for this kind.
  async listStaleCalendarLists(
    before: Date,
    limit: number,
  ): Promise<SyncResourceRecord[]> {
    return this.#listForSweep(
      {
        resourceKind: "calendarList",
        $or: [{ lastSuccessAt: { $lt: before } }, { lastSuccessAt: null }],
      },
      { lastAttemptAt: 1, lastSuccessAt: 1 },
      limit,
    );
  }

  // Clear the calendarList resource's incremental cursor so the next
  // calendarListSync pass — whichever job runs it, sweep-enqueued or otherwise
  // — goes full rather than incremental (syncCalendarList treats a null cursor
  // as `fullList`). Deliberately leaves lastSuccessAt untouched: that field is
  // the staleness key the rediscovery sweep sorts on, and touching it here
  // would let a resource that hasn't actually re-synced yet win the front of
  // every subsequent sweep cycle.
  async clearSyncCursor(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
  ): Promise<void> {
    await this.#patch(tenantId, principalId, id, {
      syncCursor: null,
      pageCursor: null,
    });
  }

  // Hard-delete every sync resource for one connection (post-disconnect retention).
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

  // Hard-delete every sync resource for a principal (account deletion).
  async deleteByPrincipal(
    tenantId: TenantId,
    principalId: PrincipalId,
  ): Promise<number> {
    const result = await this.collection.deleteMany({ tenantId, principalId });
    return result.deletedCount;
  }
}
