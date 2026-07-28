import { type DateTime, type EventId } from "@core/types/domain-primitives";
import { type EditableRecurrence } from "@core/types/event.contracts";
import { type SyncEventRecurrence } from "@core/types/sync/event.contracts";
import { type ProviderCalendarId } from "@core/types/sync/identity.contracts";
import { type SyncExecutionMode } from "@sync/config/sync.config";
import { type CredentialCustody } from "@sync/credentials/credential-custody.service";
import { mergeUpdateContent } from "@sync/domain/merge-update-content";
import { normalizeStoredContent } from "@sync/domain/normalize-stored-content";
import {
  occurrenceScheduleAt,
  scheduleStartAt,
  stripRuleBounds,
  truncateRulesBefore,
} from "@sync/domain/occurrence-projection";
import {
  executeProviderCreate,
  executeProviderDelete,
  executeProviderSeriesUpdate,
  executeProviderUpdate,
} from "@sync/domain/provider-command.service";
import { reprojectOccurrences } from "@sync/domain/reproject";
import { type ProviderEventWriter } from "@sync/providers/provider-event-writer.port";
import {
  type CommandRecord,
  type CommandSubmit,
} from "@sync/storage/contracts/command.contracts";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";
import { type DeletionMarkerRepository } from "@sync/storage/repositories/deletion-marker.repository";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { createHash } from "node:crypto";

export interface CloudCommandDeps {
  commands: CommandRepository;
  events: EventRepository;
  calendars: ProviderCalendarRepository;
  // The derived occurrence projection, rebuilt for an event's horizon whenever
  // a cloud command changes it so range queries stay current.
  occurrences: EventOccurrenceRepository;
  // The deletion-marker store, for the tombstone a provider delete leaves.
  markers: DeletionMarkerRepository;
  execution: SyncExecutionMode;
  // Provider write capability, present only when a provider is configured and
  // provider work is enabled. Absent means provider-targeted commands stay
  // pending instead of executing.
  provider?: {
    writer: ProviderEventWriter;
    custody: CredentialCustody;
  };
}

// Durably record a command and, for a cloud-only create, apply it to the
// canonical event store and confirm it locally — no provider round-trip. The
// whole operation is idempotent: submit dedupes on the idempotency key, the
// event write is keyed by the client-supplied event id, and confirmation only
// runs while the command is still pending. So a retry after a crash at any
// point converges on one confirmed command and one event.
//
// A command with a provider target (its calendar is a connected provider
// calendar) is left pending here: confirming it locally would skip the provider
// write. The provider execution path applies and confirms it. A non-create
// command is likewise persisted as durable pending intent and returned
// unchanged; applying update/move/delete locally lands in a later slice.
export async function submitCloudCommand(
  deps: CloudCommandDeps,
  submit: CommandSubmit,
  now: () => Date,
): Promise<{ command: CommandRecord; changed: boolean }> {
  const { record: command, inserted } = await deps.commands.submit(submit);

  // Only a freshly-persisted create is applied here. A command already past
  // pending (a confirmed replay, or a kind we don't apply yet) is returned as
  // it stands, so a repeated submit never re-applies or overwrites an outcome.
  if (command.outcome.state !== "pending") {
    return { command, changed: false };
  }
  const initialOutcomeState = command.outcome.state;
  const finish = (
    final: CommandRecord,
  ): { command: CommandRecord; changed: boolean } => ({
    command: final,
    changed: inserted || final.outcome.state !== initialOutcomeState,
  });

  // update/delete apply to an existing event; move is not handled yet.
  if (command.input.kind === "update" || command.input.kind === "delete") {
    return finish(await applyCloudMutation(deps, command, now));
  }
  if (command.input.kind !== "create") return finish(command);

  // A create whose target calendar is a connected provider calendar must go to
  // the provider, not be confirmed as a local cloud event. Execute it now when
  // provider work is enabled; otherwise leave it pending for a later execution.
  // A calendar id that resolves to no provider calendar is a Compass cloud
  // calendar, so it is applied locally below.
  const providerCalendar = await deps.calendars.findById(
    command.tenantId,
    command.principalId,
    command.input.calendarId as ProviderCalendarId,
  );
  if (providerCalendar) {
    if (deps.execution === "active" && deps.provider) {
      return finish(
        await executeProviderCreate(
          {
            commands: deps.commands,
            events: deps.events,
            occurrences: deps.occurrences,
            writer: deps.provider.writer,
            custody: deps.provider.custody,
          },
          command,
          providerCalendar,
          now,
        ),
      );
    }
    return finish(command);
  }

  const record = buildCloudEventRecord(command, now());
  await deps.events.put(record);
  await reprojectOccurrences(deps.occurrences, record, now);
  return finish(await confirmCloud(deps, command));
}

// Apply a cloud-only update or delete to an existing event. Only single,
// unlinked events are handled here: a provider-linked event needs the provider
// mutation path, and a recurring series needs scope handling — both land in
// later slices, so those commands are left pending. Delete is idempotent (an
// already-absent event confirms), so a retry after a crash converges.
async function applyCloudMutation(
  deps: CloudCommandDeps,
  command: CommandRecord,
  now: () => Date,
): Promise<CommandRecord> {
  const existing = await deps.events.findById(
    command.tenantId,
    command.principalId,
    command.eventId,
  );

  if (command.input.kind === "delete") {
    // Absence is the desired end state, so a delete of an already-gone (or
    // never-created) event is confirmed rather than left hanging.
    if (!existing) return confirmCloud(deps, command);
    // A series master: for a provider series, only scope "all" is handled here
    // (delete the whole series at the provider); this/thisAndFollowing need
    // provider exception ops and stay pending. For a cloud series, scope "all"
    // removes the whole series, "this" cancels one occurrence, thisAndFollowing
    // splits it.
    if (existing.recurrence.kind === "seriesMaster") {
      if (existing.connectionId !== null) {
        if (command.input.scope !== "all") return command;
        return dispatchProviderDelete(deps, command, existing, now);
      }
      if (command.input.scope === "all") {
        return deleteCloudSeries(deps, command, existing);
      }
      if (command.input.scope === "this") {
        return deleteCloudOccurrence(deps, command, existing, now);
      }
      return deleteCloudSeriesFollowing(deps, command, existing, now);
    }
    // A bare exception target (this/thisAndFollowing) also stays pending.
    if (existing.recurrence.kind !== "single") return command;
    // A provider-linked event goes to the provider delete path; a cloud event is
    // removed locally below. Content is removed only after the provider confirms.
    if (existing.connectionId !== null) {
      return dispatchProviderDelete(deps, command, existing, now);
    }
    // Clear the derived occurrences BEFORE removing the event. If this crashes
    // before the delete, a retry still finds the event and re-runs both steps;
    // deleting first would let a crash in between orphan the occurrence rows,
    // since the retry's `!existing` branch confirms without ever clearing them.
    await deps.occurrences.replaceForEvent(
      command.eventId,
      existing.generation,
      [],
    );
    await deps.events.deleteById(
      command.tenantId,
      command.principalId,
      command.eventId,
    );
    return confirmCloud(deps, command);
  }

  // Only update remains (applyCloudMutation is called for update/delete).
  if (command.input.kind !== "update") return command;

  // update: the target must exist; a missing event can't be updated, so leave
  // the command pending rather than confirming a no-op.
  if (!existing) return command;
  // A series master. For a cloud series, scope "all" edits the whole series,
  // "this" overrides one occurrence, thisAndFollowing splits at the target. For
  // a provider series, only scope "all" is handled here (edit the whole series
  // at the provider); this/thisAndFollowing need provider exception ops and stay
  // pending.
  if (existing.recurrence.kind === "seriesMaster") {
    if (existing.connectionId !== null) {
      if (command.input.scope !== "all") return command;
      return dispatchProviderSeriesUpdate(deps, command, existing, now);
    }
    if (command.input.scope === "all") {
      return updateCloudSeries(deps, command, existing, now);
    }
    if (command.input.scope === "this") {
      return updateCloudOccurrence(deps, command, existing, now);
    }
    return updateCloudSeriesFollowing(deps, command, existing, now);
  }
  // A bare exception target stays pending, and converting a single event into a
  // series is itself a series edit — defer both. Gating on the command's intent
  // (not the event's post-write recurrence) keeps a retry converging: an applied
  // single-event update never changes recurrence.kind here.
  if (existing.recurrence.kind !== "single") return command;
  if (command.input.recurrence.kind === "series") return command;

  // A provider-linked event goes to the provider when provider work is enabled;
  // otherwise it stays pending for a later execution.
  if (existing.connectionId !== null) {
    if (deps.execution === "active" && deps.provider) {
      const calendar = await deps.calendars.findById(
        command.tenantId,
        command.principalId,
        existing.calendarId as ProviderCalendarId,
      );
      if (calendar) {
        return executeProviderUpdate(
          {
            commands: deps.commands,
            events: deps.events,
            occurrences: deps.occurrences,
            writer: deps.provider.writer,
            custody: deps.provider.custody,
          },
          command,
          existing,
          calendar,
          now,
        );
      }
    }
    return command;
  }

  // Cloud single event: conditional replace (no upsert), so a concurrent delete
  // is not resurrected — a miss leaves the command pending.
  const updated = applyCloudUpdate(existing, command, now());
  const applied = await deps.events.replaceExisting(updated);
  if (!applied) return command;
  await reprojectOccurrences(deps.occurrences, updated, now);
  return confirmCloud(deps, command);
}

// Route a delete of a provider-linked event to the provider executor when
// provider work is enabled and the owning calendar resolves; otherwise leave the
// command pending. Content is removed only after the provider confirms. Deleting
// a series master here cancels the whole series at the provider. Shared by the
// single-event and provider-series-all delete paths.
async function dispatchProviderDelete(
  deps: CloudCommandDeps,
  command: CommandRecord,
  event: EventRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (deps.execution !== "active" || !deps.provider) return command;
  const calendar = await deps.calendars.findById(
    command.tenantId,
    command.principalId,
    event.calendarId as ProviderCalendarId,
  );
  if (!calendar) return command;
  return executeProviderDelete(
    {
      commands: deps.commands,
      events: deps.events,
      occurrences: deps.occurrences,
      writer: deps.provider.writer,
      custody: deps.provider.custody,
      markers: deps.markers,
    },
    command,
    event,
    calendar,
    now,
  );
}

// Route a scope-"all" edit of a provider-linked series master to the provider
// executor when provider work is enabled and the owning calendar resolves;
// otherwise leave the command pending. This edits the whole series at the
// provider (Google's edit-all).
async function dispatchProviderSeriesUpdate(
  deps: CloudCommandDeps,
  command: CommandRecord,
  master: EventRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (deps.execution !== "active" || !deps.provider) return command;
  const calendar = await deps.calendars.findById(
    command.tenantId,
    command.principalId,
    master.calendarId as ProviderCalendarId,
  );
  if (!calendar) return command;
  return executeProviderSeriesUpdate(
    {
      commands: deps.commands,
      events: deps.events,
      occurrences: deps.occurrences,
      writer: deps.provider.writer,
      custody: deps.provider.custody,
    },
    command,
    master,
    calendar,
    now,
  );
}

// Apply a scope-"all" edit to a cloud series. An edit-all discards per-instance
// content/time OVERRIDES (they revert to the edited series), but a cancelled
// exception is a per-instance DELETION and must survive — those are kept and
// their instants excluded from the reprojected master, so a deleted occurrence
// is not resurrected by a later series edit. Converting the series to a single
// event drops every exception, cancellations included, since a single event has
// no instances.
//
// Exceptions are cleared BEFORE the master is replaced, on purpose. An edit-all
// can convert the series to a single event; if the replace ran first, a crash
// before the cleanup would make the retry read a single-kind event and take the
// single-event path, which never cleans exceptions — orphaning them. Clearing
// first means the discarded ones are gone before the master's recurrence kind
// can change, so a retry converges down either path. Gating the kept/discarded
// split on the command's immutable recurrence intent keeps that classification
// stable across retries. replaceExisting returns false only when the master is
// already gone, in which case discarding its overrides was still right.
async function updateCloudSeries(
  deps: CloudCommandDeps,
  command: CommandRecord,
  master: EventRecord,
  now: () => Date,
): Promise<CommandRecord> {
  const convertsToSingle =
    command.input.kind === "update" &&
    command.input.recurrence.kind === "single";
  const exceptions = await deps.events.findSeriesExceptions(
    command.tenantId,
    command.principalId,
    master._id,
  );
  const kept = convertsToSingle ? [] : exceptions.filter(isCancelledException);
  const discarded = convertsToSingle
    ? exceptions
    : exceptions.filter((exception) => !isCancelledException(exception));

  await deleteExceptions(deps, command, discarded);
  const updated = applyCloudUpdate(master, command, now());
  const applied = await deps.events.replaceExisting(updated);
  if (!applied) return command;
  await reprojectOccurrences(
    deps.occurrences,
    updated,
    now,
    kept.map(exceptionInstant),
  );
  return confirmCloud(deps, command);
}

// Delete a whole cloud series: clear the master's occurrences, remove every
// exception (occurrences first), then remove the master LAST. Deleting the
// master last keeps the delete branch's `!existing` short-circuit a valid
// "already fully deleted" signal — if the master is gone on a retry, its
// exceptions were removed before it. Every step is idempotent.
async function deleteCloudSeries(
  deps: CloudCommandDeps,
  command: CommandRecord,
  master: EventRecord,
): Promise<CommandRecord> {
  await deps.occurrences.replaceForEvent(master._id, master.generation, []);
  const exceptions = await deps.events.findSeriesExceptions(
    command.tenantId,
    command.principalId,
    master._id,
  );
  await deleteExceptions(deps, command, exceptions);
  await deps.events.deleteById(
    command.tenantId,
    command.principalId,
    master._id,
  );
  return confirmCloud(deps, command);
}

// Remove the given exception events and clear each one's occurrences.
async function deleteExceptions(
  deps: CloudCommandDeps,
  command: CommandRecord,
  exceptions: readonly EventRecord[],
): Promise<void> {
  for (const exception of exceptions) {
    await deps.occurrences.replaceForEvent(
      exception._id,
      exception.generation,
      [],
    );
    await deps.events.deleteById(
      command.tenantId,
      command.principalId,
      exception._id,
    );
  }
}

function isCancelledException(event: EventRecord): boolean {
  return event.recurrence.kind === "exception" && event.recurrence.cancelled;
}

// The original instant a series exception overrides — its recurrence identity.
function exceptionInstant(event: EventRecord): DateTime {
  if (event.recurrence.kind !== "exception") {
    throw new Error("exceptionInstant requires an exception event");
  }
  return event.recurrence.recurrenceId;
}

// Cancel one occurrence of a cloud series (scope "this"): upsert a cancelled
// exception tombstone at the target instant, reproject the master to exclude
// that instant, then project the tombstone's own (cancelled) row. The exception
// upsert is keyed on (series, recurrenceId), so a retry lands on the same
// tombstone instead of duplicating it.
async function deleteCloudOccurrence(
  deps: CloudCommandDeps,
  command: CommandRecord,
  master: EventRecord,
  now: () => Date,
): Promise<CommandRecord> {
  // The contract guarantees a this-scope delete carries a recurrenceId.
  if (command.input.kind !== "delete" || command.input.recurrenceId === null) {
    return command;
  }
  const recurrenceId = command.input.recurrenceId;
  const exception = await deps.events.upsertException(
    master,
    recurrenceId,
    {
      content: master.content,
      schedule: occurrenceScheduleAt(master.schedule, recurrenceId),
      cancelled: true,
    },
    now(),
  );
  await reprojectMaster(deps, command, master, now);
  await reprojectOccurrences(deps.occurrences, exception, now);
  return confirmCloud(deps, command);
}

// Override one occurrence of a cloud series (scope "this"): upsert an exception
// carrying the edit at the target instant, reproject the master to exclude that
// instant, then project the exception's own occurrence. Idempotent on the same
// (series, recurrenceId) key.
async function updateCloudOccurrence(
  deps: CloudCommandDeps,
  command: CommandRecord,
  master: EventRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "update" || command.input.recurrenceId === null) {
    return command;
  }
  const exception = await deps.events.upsertException(
    master,
    command.input.recurrenceId,
    {
      content: mergeUpdateContent(master.content, command.input.content),
      schedule: command.input.schedule,
      cancelled: false,
    },
    now(),
  );
  await reprojectMaster(deps, command, master, now);
  await reprojectOccurrences(deps.occurrences, exception, now);
  return confirmCloud(deps, command);
}

// Reproject a series master excluding every instant one of its exceptions owns,
// so the master never projects an occurrence at an excepted instant. Fetches the
// exceptions fresh, so it picks up the one a scope-"this" edit just wrote.
async function reprojectMaster(
  deps: CloudCommandDeps,
  command: CommandRecord,
  master: EventRecord,
  now: () => Date,
): Promise<void> {
  const exceptions = await deps.events.findSeriesExceptions(
    command.tenantId,
    command.principalId,
    master._id,
  );
  await reprojectOccurrences(
    deps.occurrences,
    master,
    now,
    exceptions.map(exceptionInstant),
  );
}

// Delete one occurrence of a cloud series and every occurrence after it (scope
// "thisAndFollowing"): truncate the master's rule to end before the split point,
// drop the exceptions at or after it, and reproject the shortened master. A
// split at the series' first occurrence removes the whole series, so it collapses
// to delete-all. The master keeps its kind (still a series), so a retry re-enters
// here; truncation and the following-exception cleanup are both idempotent.
async function deleteCloudSeriesFollowing(
  deps: CloudCommandDeps,
  command: CommandRecord,
  master: EventRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "delete" || command.input.recurrenceId === null) {
    return command;
  }
  if (master.recurrence.kind !== "seriesMaster") return command;
  const splitAt = new Date(command.input.recurrenceId);
  if (splitAt.getTime() <= scheduleStartAt(master.schedule).getTime()) {
    return deleteCloudSeries(deps, command, master);
  }

  await deleteFollowingExceptions(deps, command, master._id, splitAt);
  const truncated: EventRecord = {
    ...master,
    recurrence: {
      kind: "seriesMaster",
      rules: truncateRulesBefore(master.recurrence.rules, splitAt),
    },
    updatedAt: now(),
  };
  const applied = await deps.events.replaceExisting(truncated);
  if (!applied) return command;
  await reprojectMaster(deps, command, truncated, now);
  return confirmCloud(deps, command);
}

// Delete every exception at or after the split instant and clear its occurrences.
async function deleteFollowingExceptions(
  deps: CloudCommandDeps,
  command: CommandRecord,
  seriesId: EventRecord["_id"],
  splitAt: Date,
): Promise<void> {
  const exceptions = await deps.events.findSeriesExceptions(
    command.tenantId,
    command.principalId,
    seriesId,
  );
  const following = exceptions.filter(
    (exception) =>
      new Date(exceptionInstant(exception)).getTime() >= splitAt.getTime(),
  );
  await deleteExceptions(deps, command, following);
}

// Edit one occurrence of a cloud series and every occurrence after it (scope
// "thisAndFollowing") by SPLITTING the series: truncate the original master to
// end before the split, drop the exceptions at or after it, and stand up a new
// remainder master carrying the edit from the split point on. A split at the
// series' first occurrence edits the whole series, so it collapses to edit-all.
//
// The remainder master's id is derived deterministically from (originalMaster,
// split) so a retry upserts the SAME master instead of creating a second series.
// The original is truncated (and reprojected) before the remainder is created,
// so the worst transient state is a momentary gap at the split, never a
// duplicate; every step is idempotent, so a retry converges.
async function updateCloudSeriesFollowing(
  deps: CloudCommandDeps,
  command: CommandRecord,
  master: EventRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "update" || command.input.recurrenceId === null) {
    return command;
  }
  if (master.recurrence.kind !== "seriesMaster") return command;
  const splitAt = new Date(command.input.recurrenceId);
  if (splitAt.getTime() <= scheduleStartAt(master.schedule).getTime()) {
    return updateCloudSeries(deps, command, master, now);
  }

  await deleteFollowingExceptions(deps, command, master._id, splitAt);
  const truncated: EventRecord = {
    ...master,
    recurrence: {
      kind: "seriesMaster",
      rules: truncateRulesBefore(master.recurrence.rules, splitAt),
    },
    updatedAt: now(),
  };
  const applied = await deps.events.replaceExisting(truncated);
  if (!applied) return command;
  await reprojectMaster(deps, command, truncated, now);

  const remainder = buildRemainderMaster(master, command, now());
  await deps.events.put(remainder);
  await reprojectOccurrences(deps.occurrences, remainder, now);
  return confirmCloud(deps, command);
}

// Build the remainder series of a thisAndFollowing split: a fresh master at the
// edit's schedule, carrying the edited content and recurrence, with a
// deterministic id so a retry converges on one series. "preserve" continues the
// original cadence (bounds stripped, so it runs open-ended from the split).
function buildRemainderMaster(
  master: EventRecord,
  command: CommandRecord,
  now: Date,
): EventRecord {
  if (command.input.kind !== "update") {
    throw new Error("buildRemainderMaster requires an update command");
  }
  if (master.recurrence.kind !== "seriesMaster") {
    throw new Error("buildRemainderMaster requires a series master");
  }
  const { input } = command;
  const recurrence: SyncEventRecurrence =
    input.recurrence.kind === "series"
      ? { kind: "seriesMaster", rules: input.recurrence.rules }
      : input.recurrence.kind === "single"
        ? { kind: "single" }
        : {
            kind: "seriesMaster",
            rules: stripRuleBounds(master.recurrence.rules),
          };
  return {
    ...master,
    _id: remainderMasterId(master._id, command.input.recurrenceId as DateTime),
    clientEventId: null,
    content: mergeUpdateContent(master.content, input.content),
    schedule: input.schedule,
    recurrence,
    createdAt: now,
    updatedAt: now,
    confirmedAt: now,
  };
}

// A deterministic event id for the remainder series, so the same split always
// resolves to the same master and a retry never duplicates it. A 24-hex prefix
// of a SHA-256 over (seriesId, split) is a valid event id and collision-safe.
function remainderMasterId(seriesId: EventId, splitAt: DateTime): EventId {
  return createHash("sha256")
    .update(`${seriesId}:${splitAt}`)
    .digest("hex")
    .slice(0, 24) as EventId;
}

// Confirm a cloud command with no provider identity — local persistence is the
// only durability it needs. updateOutcome only misses if the command vanished
// between submit and now (it cannot, within one request), so fall back to the
// pending record rather than inventing an outcome.
async function confirmCloud(
  deps: CloudCommandDeps,
  command: CommandRecord,
): Promise<CommandRecord> {
  const confirmed = await deps.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    { state: "confirmed", providerEventId: null, providerVersion: null },
    command.attemptCount,
  );
  return confirmed ?? command;
}

// Apply an update command's content/schedule/recurrence to an existing cloud
// event, preserving its identity and provider fields. "preserve" keeps the
// current recurrence; "single"/"series" set it. Content merges so a
// title/description edit cannot wipe provider-sourced attendees/etc.
function applyCloudUpdate(
  existing: EventRecord,
  command: CommandRecord,
  now: Date,
): EventRecord {
  if (command.input.kind !== "update") {
    throw new Error("applyCloudUpdate requires an update command");
  }
  const { input } = command;
  return {
    ...existing,
    content: mergeUpdateContent(existing.content, input.content),
    schedule: input.schedule,
    recurrence:
      input.recurrence.kind === "preserve"
        ? existing.recurrence
        : input.recurrence.kind === "series"
          ? { kind: "seriesMaster", rules: input.recurrence.rules }
          : { kind: "single" },
    updatedAt: now,
  };
}

// Build the canonical event for a cloud-only create. All provider fields are
// null — this event has no provider target — and it is confirmed at creation
// because local persistence is the only durability it needs. The id is the
// client-supplied event id, so a retried create replaces rather than duplicates.
function buildCloudEventRecord(command: CommandRecord, now: Date): EventRecord {
  if (command.input.kind !== "create") {
    throw new Error("buildCloudEventRecord requires a create command");
  }
  const { input } = command;
  return {
    _id: command.eventId,
    tenantId: command.tenantId,
    principalId: command.principalId,
    origin: "compass",
    calendarId: input.calendarId,
    // Preserve the device-event identity when this create is a promotion of an
    // anonymous event; null for a plain cloud create.
    clientEventId: input.clientEventId,
    connectionId: null,
    providerEventId: null,
    providerVersion: null,
    providerUpdatedAt: null,
    deliveryState: null,
    providerMetadata: null,
    content: normalizeStoredContent(input.content),
    schedule: input.schedule,
    recurrence: toStoredRecurrence(input.recurrence),
    lifecycleState: "active",
    // Always correct here: a cloud event lives on a calendar with no provider
    // sync resource, so nothing ever repairs it into a new generation and reads
    // serve generation 0 for it unconditionally. (The provider-linked create
    // path documents the one narrow, self-healing generation gap.)
    generation: 0,
    createdAt: now,
    updatedAt: now,
    confirmedAt: now,
  };
}

// The create wire input carries the editable recurrence (single | series); the
// stored form is the fuller union (single | seriesMaster | exception). A create
// can only ever produce a single event or a series master.
function toStoredRecurrence(
  recurrence: EditableRecurrence,
): SyncEventRecurrence {
  return recurrence.kind === "series"
    ? { kind: "seriesMaster", rules: recurrence.rules }
    : { kind: "single" };
}
