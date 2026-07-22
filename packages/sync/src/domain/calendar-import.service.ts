import { type DateTime, type EventId } from "@core/types/domain-primitives";
import { type SyncEventRecurrence } from "@core/types/sync/event.contracts";
import { syncHorizon } from "@sync/domain/horizon";
import { occurrenceScheduleAt } from "@sync/domain/occurrence-projection";
import { type AccessTokenSource } from "@sync/domain/provider-command.service";
import { reprojectOccurrences } from "@sync/domain/reproject";
import {
  type ProviderEvent,
  type ProviderEventCancellation,
  type ProviderEventRead,
} from "@sync/providers/provider-event.port";
import {
  type EventWindow,
  type ProviderEventReader,
} from "@sync/providers/provider-event-reader.port";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface CalendarImportDeps {
  events: EventRepository;
  occurrences: EventOccurrenceRepository;
  resources: SyncResourceRepository;
  reader: ProviderEventReader;
  custody: AccessTokenSource;
}

export interface CalendarImportResult {
  resource: SyncResourceRecord;
  // Distinct events written this run (masters, singles, and linked exceptions —
  // overrides and cancelled tombstones), counted once regardless of how many
  // passes or retries touched each.
  imported: number;
  // Events dropped: unusable reads the reader skipped, plus series members whose
  // master never appeared (a provider anomaly).
  skipped: number;
}

// Import one provider calendar's events until the resource holds a durable
// incremental cursor.
//
// Two passes drive the reader. A WINDOWED pass over the rolling horizon runs
// first so the user's useful range appears quickly; it cannot yield a cursor
// (providers forbid combining a window with one), so a FULL unwindowed pass
// follows, checkpointing the page token in the sync resource after each page
// commits — a crash resumes from the checkpoint instead of restarting. The
// incremental cursor is committed only after the full pass and every projection
// it implies have completed, so the cursor never advances past uncommitted
// data. Every write is an idempotent provider-identity upsert and every
// projection replaces per (event, generation), so re-running any prefix
// converges.
//
// A deleted occurrence of an otherwise-active series comes back from a full
// list (showDeleted) as a cancellation carrying its series link; it is written
// as a cancelled exception so the master's expansion excludes that instant,
// never resurrecting the deleted occurrence.
//
// Ordering hazards handled:
// - A series MEMBER (a modified instance or a cancelled occurrence) can arrive
//   before its master (providers return events in arbitrary order). Unresolved
//   members are buffered and retried after each page and once more at the end
//   of each pass; a member whose master never appears is counted skipped. Named
//   wart: a buffered cross-page member is lost if the process crashes after its
//   own page was checkpointed but before its master arrived — bounded to one
//   exception, and repair or an incremental pull re-delivers it.
// - A master's projection must exclude the instants its exceptions own, and an
//   exception can land pages after its master. Masters therefore reproject
//   from a fresh exception read every time one of their exceptions links, and
//   projections for a page run BEFORE that page's checkpoint so a resumed run
//   never skips them.
export async function importCalendarEvents(
  deps: CalendarImportDeps,
  calendar: ProviderCalendarRecord,
  now: () => Date,
): Promise<CalendarImportResult> {
  const resource = await deps.resources.ensure({
    tenantId: calendar.tenantId,
    principalId: calendar.principalId,
    connectionId: calendar.connectionId,
    resourceKind: "events",
    calendarId: calendar._id,
  });

  // A cursor means the initial import already completed; incremental pulls own
  // this resource from here.
  if (resource.syncCursor !== null) {
    return { resource, imported: 0, skipped: 0 };
  }

  const accessToken = await deps.custody.getValidAccessToken(
    calendar.connectionId,
  );
  await deps.resources.markAttempt(
    resource.tenantId,
    resource.principalId,
    resource._id,
    now(),
  );

  const run = new ImportRun(deps, calendar, resource, now);

  // The windowed fast pass only runs on a fresh start — a resume mid-full-pass
  // already imported the window, and redoing it would only repeat work.
  if (resource.pageCursor === null) {
    await run.readPass({ accessToken, window: horizonWindow(now()) });
  }

  const syncCursor = await run.readPass({
    accessToken,
    checkpointed: true,
    resumeFrom: resource.pageCursor,
  });
  await run.resolveRemainingInstances();

  if (!syncCursor) {
    // Without a cursor the resource can never go incremental; surfacing this
    // loudly beats silently re-importing forever.
    throw new Error(
      "Provider returned no sync cursor after a full unwindowed pass",
    );
  }
  await deps.resources.advanceCursor(
    resource.tenantId,
    resource.principalId,
    resource._id,
    syncCursor,
    now(),
  );

  const updated = await deps.resources.findById(
    resource.tenantId,
    resource.principalId,
    resource._id,
  );
  return {
    resource: updated ?? resource,
    imported: run.imported,
    skipped: run.skipped,
  };
}

// One import run's working state: the masters seen so far (to link instances),
// the series members still waiting for their master, and the running counts.
class ImportRun {
  // Distinct provider event ids written, so the windowed and full passes (the
  // full pass is a superset of the windowed one) and a crash-resumed page never
  // inflate the count by re-upserting the same idempotent row.
  #importedIds = new Set<string>();
  // Per-event reads the reader dropped as unusable, plus series members whose
  // master never appeared. Only the full pass contributes reader-dropped counts
  // (the windowed pass's are re-seen and re-counted by the superset full pass).
  #skipped = 0;

  get imported(): number {
    return this.#importedIds.size;
  }
  get skipped(): number {
    return this.#skipped;
  }

  // Local master by the PROVIDER's series id, for linking instances.
  #masters = new Map<string, EventRecord>();
  // Series members (modified instances and cancelled occurrences) read before
  // their master, awaiting it.
  #pending: ProviderEventRead[] = [];

  constructor(
    private readonly deps: CalendarImportDeps,
    private readonly calendar: ProviderCalendarRecord,
    private readonly resource: SyncResourceRecord,
    private readonly now: () => Date,
  ) {}

  // Drive the reader through one pass. Returns the provider's sync cursor when
  // the pass produced one (only an unwindowed pass can).
  async readPass(options: {
    accessToken: string;
    window?: EventWindow;
    checkpointed?: boolean;
    resumeFrom?: string | null;
  }): Promise<string | null> {
    let pageToken: string | null = options.resumeFrom ?? null;
    let syncCursor: string | null = null;

    do {
      const page = await this.deps.reader.listEventPage({
        accessToken: options.accessToken,
        calendarId: this.calendar.providerCalendarId,
        window: options.window ?? null,
        pageToken,
      });
      // Count reader-dropped events on the full pass only; the windowed pass
      // sees a subset the full pass re-reads, so counting both double-counts.
      if (options.checkpointed) this.#skipped += page.skipped;
      await this.#applyPage(page.events);

      pageToken = page.nextPageToken;
      syncCursor = page.nextSyncToken ?? syncCursor;
      // The checkpoint is the durability barrier: it moves only after the
      // page's upserts AND projections committed, so a crash-resume re-reads
      // at most one already-applied (idempotent) page.
      if (options.checkpointed && pageToken) {
        await this.deps.resources.setPageCheckpoint(
          this.resource.tenantId,
          this.resource.principalId,
          this.resource._id,
          pageToken,
        );
      }
    } while (pageToken);

    return syncCursor;
  }

  // Give every still-buffered series member one final chance to link,
  // projecting the masters that gain an exception, then count the rest as
  // skipped provider anomalies (a member whose master never appeared).
  async resolveRemainingInstances(): Promise<void> {
    for (const master of await this.#drainPending()) {
      await this.#projectSeries(master);
    }
    this.#skipped += this.#pending.length;
    this.#pending = [];
  }

  // Upsert and project one page. Masters first so same-page members link
  // without a buffer round-trip. A cancelled occurrence of a series is written
  // as a cancelled exception (so the master's expansion excludes its instant);
  // a standalone cancellation has no local event to tombstone on a first
  // import, so it is ignored.
  async #applyPage(events: readonly ProviderEventRead[]): Promise<void> {
    const touchedSeries = new Map<EventId, EventRecord>();

    for (const read of events) {
      if (read.kind === "event" && read.recurrence.kind === "seriesMaster") {
        const master = await this.#upsertRead(read, {
          kind: "seriesMaster",
          rules: read.recurrence.rules,
        });
        this.#masters.set(read.providerEventId, master);
        touchedSeries.set(master._id, master);
      }
    }
    for (const read of events) {
      if (read.kind === "event" && read.recurrence.kind === "single") {
        const single = await this.#upsertRead(read, { kind: "single" });
        await reprojectOccurrences(this.deps.occurrences, single, this.now);
      } else if (this.#needsMaster(read)) {
        const master = await this.#link(read);
        if (master) touchedSeries.set(master._id, master);
        else this.#pending.push(read);
      }
    }

    // A buffered member's master may have arrived on this page.
    for (const master of await this.#drainPending()) {
      touchedSeries.set(master._id, master);
    }

    for (const master of touchedSeries.values()) {
      await this.#projectSeries(master);
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
    const record = await this.deps.events.upsertByProviderIdentity({
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
      generation: this.resource.importGeneration,
      confirmedAt: this.now(),
    });
    this.#importedIds.add(record.providerEventId as string);
  }

  // The locally stored master for a provider series id: seen this run, or
  // imported by an earlier page/run and read back by provider identity.
  async #resolveMaster(seriesProviderId: string): Promise<EventRecord | null> {
    const seen = this.#masters.get(seriesProviderId);
    if (seen) return seen;
    const stored = await this.deps.events.findByProviderIdentity(
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
    const exceptions = await this.deps.events.findSeriesExceptions(
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
    await reprojectOccurrences(
      this.deps.occurrences,
      master,
      this.now,
      instants,
    );
    for (const exception of exceptions) {
      await reprojectOccurrences(this.deps.occurrences, exception, this.now);
    }
  }

  async #upsertRead(
    read: ProviderEvent,
    recurrence: SyncEventRecurrence,
  ): Promise<EventRecord> {
    const record = await this.deps.events.upsertByProviderIdentity({
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
      // Busy is the overwhelming default; only a free ("transparent") event
      // records its transparency, so the fact survives until the busy-query
      // slice decides how to read it.
      providerMetadata: read.busy ? null : { transparency: "transparent" },
      content: read.content,
      schedule: read.schedule,
      recurrence,
      lifecycleState: "active",
      generation: this.resource.importGeneration,
      confirmedAt: this.now(),
    });
    this.#importedIds.add(record.providerEventId as string);
    return record;
  }
}

// The rolling horizon as an RFC3339 window for the fast first pass.
function horizonWindow(now: Date): EventWindow {
  const horizon = syncHorizon(now);
  return {
    timeMin: horizon.start.toISOString(),
    timeMax: horizon.end.toISOString(),
  };
}
