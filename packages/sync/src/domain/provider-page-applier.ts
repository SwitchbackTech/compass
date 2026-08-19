import { type DateTime, type EventId } from "@core/types/domain-primitives";
import { type SyncEventRecurrence } from "@core/types/sync/event.contracts";
import { occurrenceScheduleAt } from "@sync/domain/occurrence-projection";
import {
  type ReprojectBatchEntry,
  reprojectOccurrencesBatch,
} from "@sync/domain/reproject";
import {
  type ProviderEvent,
  type ProviderEventCancellation,
  type ProviderEventRead,
} from "@sync/providers/provider-event.port";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";

// Events per batched occurrence-projection transaction. A single Google page
// can hold up to 2500 events (google-event-reader.adapter.ts's maxResults);
// keeping each transaction to a few hundred events comfortably avoids Atlas's
// 60s transaction lifetime limit on the shared tier.
const PROJECTION_BATCH_SIZE = 200;

// The stored provider-fact bag for an imported read, null when empty. Busy is
// the overwhelming default, so only a free ("transparent") event records its
// transparency. iCalUID is the provider's cross-copy correlation key (copies
// of one meeting on different accounts share it) — stored so duplicate
// meetings across connected accounts can be recognized downstream.
function providerMetadataFor(
  read: ProviderEvent,
): Record<string, string> | null {
  const metadata = {
    ...(read.busy ? {} : { transparency: "transparent" }),
    ...(read.icalUid ? { iCalUID: read.icalUid } : {}),
  };
  return Object.keys(metadata).length > 0 ? metadata : null;
}

// Applies pages of provider event reads to the canonical store, shared by
// initial import and incremental pull. It owns the parts both paths do
// identically: upserting masters/singles, linking series members (modified
// instances and cancelled occurrences) to their master as exceptions with their
// OWN provider identity, buffering members that arrive before their master,
// and reprojecting each touched series from a fresh exception read so the
// master's expansion excludes every excepted instant. All writes are idempotent
// provider-identity upserts, so replaying a page converges.
//
// It deliberately does NOT decide what a standalone cancellation means — a
// cancelled read with no series link is a whole-event deletion, which import
// ignores (no local event yet) but a pull must apply. `applyPage` returns those
// unconsumed so each caller applies its own deletion policy.
export class ProviderPageApplier {
  // Distinct provider event ids written, so replays (an overlapping windowed
  // pass, a crash-resumed page) never inflate the count.
  #importedIds = new Set<string>();
  // Local master by the PROVIDER's series id, for linking members without a
  // store round-trip once seen.
  #masters = new Map<string, EventRecord>();
  // Series members read before their master, awaiting it.
  #pending: ProviderEventRead[] = [];
  // Occurrence reprojections accumulated across the page (singles, masters,
  // exceptions), written in one batched transaction per flush instead of one
  // transaction per event — see event-occurrence.repository.ts's
  // replaceForEvents. Cleared by #flushProjections.
  #pendingProjections: ReprojectBatchEntry[] = [];

  constructor(
    private readonly events: EventRepository,
    private readonly occurrences: EventOccurrenceRepository,
    private readonly calendar: ProviderCalendarRecord,
    private readonly generation: number,
    private readonly now: () => Date,
  ) {}

  // Distinct events written so far (masters, singles, override and cancelled
  // exceptions).
  get importedCount(): number {
    return this.#importedIds.size;
  }

  // Apply one page's content and series-scoped cancellations. Masters are
  // upserted first so same-page members link without a buffer round-trip;
  // members whose master has not been seen are buffered and retried. Returns the
  // standalone (non-series) cancellations it did not consume, for the caller's
  // deletion policy.
  async applyPage(
    reads: readonly ProviderEventRead[],
  ): Promise<ProviderEventCancellation[]> {
    const touchedSeries = new Map<EventId, EventRecord>();
    const standaloneCancellations: ProviderEventCancellation[] = [];

    for (const read of reads) {
      if (read.kind === "event" && read.recurrence.kind === "seriesMaster") {
        const master = await this.#upsertRead(read, {
          kind: "seriesMaster",
          rules: read.recurrence.rules,
        });
        this.#masters.set(read.providerEventId, master);
        touchedSeries.set(master._id, master);
      }
    }
    for (const read of reads) {
      if (read.kind === "event" && read.recurrence.kind === "single") {
        const single = await this.#upsertRead(read, { kind: "single" });
        this.#pendingProjections.push({ event: single });
      } else if (this.#needsMaster(read)) {
        const master = await this.#link(read);
        if (master) touchedSeries.set(master._id, master);
        else this.#pending.push(read);
      } else if (read.kind === "cancellation") {
        // series === null: a whole-event deletion the caller resolves.
        standaloneCancellations.push(read);
      }
    }

    // A buffered member's master may have arrived on this page.
    for (const master of await this.#drainPending()) {
      touchedSeries.set(master._id, master);
    }
    for (const master of touchedSeries.values()) {
      await this.#projectSeries(master);
    }
    await this.#flushProjections();

    // Unresolved series cancellations are also standalone deletions: pull
    // applies them by full provider id before checkpointing this page, so a
    // crash-resume cannot drop a sparse instance-shaped cancel. A later page
    // that finds the master still tombstones via #pending.
    for (const read of this.#pending) {
      if (read.kind === "cancellation") {
        standaloneCancellations.push(read);
      }
    }

    return standaloneCancellations;
  }

  // Final pass: link any still-buffered member to a now-available master,
  // project the masters that gained one, and return how many members never
  // linked (a provider anomaly — an instant with no master in any page).
  // Unresolved series cancellations are also returned so pull can fall back
  // to standalone deletion by the full provider id — a rare standalone whose
  // Google id looks like an instance must not be stranded as an orphan.
  async finish(): Promise<{
    orphans: number;
    leftoverCancellations: ProviderEventCancellation[];
  }> {
    for (const master of await this.#drainPending()) {
      await this.#projectSeries(master);
    }
    await this.#flushProjections();
    const leftoverCancellations = this.#pending.filter(
      (read): read is ProviderEventCancellation => read.kind === "cancellation",
    );
    const orphans = this.#pending.length;
    this.#pending = [];
    return { orphans, leftoverCancellations };
  }

  // Write every accumulated projection in this page as one batched
  // transaction (chunked so a very large page never approaches Atlas's 60s
  // transaction lifetime limit — see event-occurrence.repository.ts).
  async #flushProjections(): Promise<void> {
    if (this.#pendingProjections.length === 0) return;
    const batch = this.#pendingProjections;
    this.#pendingProjections = [];
    for (let i = 0; i < batch.length; i += PROJECTION_BATCH_SIZE) {
      await reprojectOccurrencesBatch(
        this.occurrences,
        batch.slice(i, i + PROJECTION_BATCH_SIZE),
        this.now,
      );
    }
  }

  // Whether a read is a series member that must resolve to a master before it
  // can be stored: a modified instance, or a cancelled occurrence of a series.
  #needsMaster(read: ProviderEventRead): boolean {
    if (read.kind === "event") return read.recurrence.kind === "instance";
    return read.series !== null;
  }

  // Try to link every still-buffered member to a now-available master. Returns
  // the masters that gained an exception, deduped, so the caller reprojects
  // each once. Projection is the caller's job, never done here.
  async #drainPending(): Promise<EventRecord[]> {
    const still: ProviderEventRead[] = [];
    const relinked = new Map<EventId, EventRecord>();
    for (const read of this.#pending) {
      const master = await this.#link(read);
      if (master) relinked.set(master._id, master);
      else still.push(read);
    }
    this.#pending = still;
    return [...relinked.values()];
  }

  // Store one series member as an exception of its locally stored master, or
  // return null when the master is not resolvable yet. Every exception keeps
  // its OWN provider identity (a provider instance/cancellation is its own
  // provider event; reusing the master's id would violate the provider-identity
  // index).
  async #link(read: ProviderEventRead): Promise<EventRecord | null> {
    if (read.kind === "event" && read.recurrence.kind === "instance") {
      const master = await this.#resolveMaster(
        read.recurrence.seriesProviderId,
      );
      if (!master) return null;
      await this.#upsertRead(read, {
        kind: "exception",
        seriesId: master._id,
        recurrenceId: read.recurrence.recurrenceId as DateTime,
        cancelled: false,
      });
      return master;
    }
    if (read.kind === "cancellation" && read.series) {
      const master = await this.#resolveMaster(read.series.seriesProviderId);
      if (!master) return null;
      await this.#upsertCancelledException(read, master);
      return master;
    }
    throw new Error("#link requires a series instance or series cancellation");
  }

  // Store a cancelled series occurrence as a cancelled exception. A cancellation
  // read carries no content or schedule (providers strip them), so the tombstone
  // mirrors the master's content and derives its schedule from the cancelled
  // instant — the same shape a Compass-side scope-"this" delete writes.
  async #upsertCancelledException(
    read: ProviderEventCancellation,
    master: EventRecord,
  ): Promise<void> {
    if (!read.series) {
      throw new Error(
        "upsertCancelledException requires a series cancellation",
      );
    }
    const recurrenceId = read.series.recurrenceId as DateTime;
    const record = await this.events.upsertByProviderIdentity({
      tenantId: this.calendar.tenantId,
      principalId: this.calendar.principalId,
      origin: "provider",
      calendarId: this.calendar._id,
      clientEventId: null,
      connectionId: this.calendar.connectionId,
      providerEventId: read.providerEventId as NonNullable<
        EventRecord["providerEventId"]
      >,
      providerVersion: read.providerVersion as NonNullable<
        EventRecord["providerVersion"]
      >,
      providerUpdatedAt: null,
      deliveryState: null,
      providerMetadata: null,
      content: master.content,
      schedule: occurrenceScheduleAt(master.schedule, recurrenceId),
      recurrence: {
        kind: "exception",
        seriesId: master._id,
        recurrenceId,
        cancelled: true,
      },
      lifecycleState: "active",
      generation: this.generation,
      confirmedAt: this.now(),
    });
    this.#importedIds.add(record.providerEventId as string);
  }

  // The locally stored master for a provider series id: seen this run, or
  // written by an earlier page/run and read back by provider identity.
  async #resolveMaster(seriesProviderId: string): Promise<EventRecord | null> {
    const seen = this.#masters.get(seriesProviderId);
    if (seen) return seen;
    const stored = await this.events.findByProviderIdentity(
      this.calendar.tenantId,
      this.calendar.principalId,
      {
        connectionId: this.calendar.connectionId,
        calendarId: this.calendar._id,
        providerEventId: seriesProviderId as NonNullable<
          EventRecord["providerEventId"]
        >,
      },
    );
    if (stored && stored.recurrence.kind === "seriesMaster") {
      this.#masters.set(seriesProviderId, stored);
      return stored;
    }
    return null;
  }

  // Reproject a master from a fresh read of its exceptions (excluding their
  // instants), then each exception's own row. Fresh reads keep this correct
  // regardless of the order pages delivered the series.
  async #projectSeries(master: EventRecord): Promise<void> {
    const exceptions = await this.events.findSeriesExceptions(
      master.tenantId,
      master.principalId,
      master._id,
    );
    const instants = exceptions.map((exception) => {
      if (exception.recurrence.kind !== "exception") {
        throw new Error("findSeriesExceptions returned a non-exception");
      }
      return exception.recurrence.recurrenceId;
    });
    this.#pendingProjections.push({
      event: master,
      excludedInstants: instants,
    });
    for (const exception of exceptions) {
      this.#pendingProjections.push({ event: exception });
    }
  }

  async #upsertRead(
    read: ProviderEvent,
    recurrence: SyncEventRecurrence,
  ): Promise<EventRecord> {
    const record = await this.events.upsertByProviderIdentity(
      {
        tenantId: this.calendar.tenantId,
        principalId: this.calendar.principalId,
        origin: "provider",
        calendarId: this.calendar._id,
        clientEventId: null,
        connectionId: this.calendar.connectionId,
        providerEventId: read.providerEventId as NonNullable<
          EventRecord["providerEventId"]
        >,
        providerVersion: read.providerVersion as NonNullable<
          EventRecord["providerVersion"]
        >,
        providerUpdatedAt: read.providerUpdatedAt
          ? new Date(read.providerUpdatedAt)
          : null,
        // Imported provider events carry no Compass delivery intent.
        deliveryState: null,
        providerMetadata: providerMetadataFor(read),
        content: read.content,
        schedule: read.schedule,
        recurrence,
        lifecycleState: "active",
        generation: this.generation,
        confirmedAt: this.now(),
      },
      // Sparse Google reads (or deploy skew) must not wipe a backfilled /
      // previously-synced iCalUID. Cancelled exceptions still clear the bag
      // via the default (non-preserve) upsert path.
      { preserveIcalUidWhenAbsent: true },
    );
    this.#importedIds.add(record.providerEventId as string);
    return record;
  }
}
