import { type DateTime, type EventId } from "@core/types/domain-primitives";
import {
  type EditableRecurrence,
  type EventSchedule,
} from "@core/types/event.contracts";
import { type RecurrenceEdit } from "@core/types/event-command.contracts";
import { type SyncCommandFailureReason } from "@core/types/sync/command.contracts";
import {
  type ProviderEventVersion,
  type SyncEventContent,
  type SyncEventRecurrence,
} from "@core/types/sync/event.contracts";
import {
  type ConnectionId,
  type ProviderEventId,
} from "@core/types/sync/identity.contracts";
import {
  mergeUpdateContent,
  omitNullColor,
} from "@sync/domain/merge-update-content";
import {
  occurrenceScheduleAt,
  scheduleStartAt,
  stripRuleBounds,
  truncateRulesBefore,
} from "@sync/domain/occurrence-projection";
import { reprojectOccurrences } from "@sync/domain/reproject";
import {
  deleteFollowingExceptions,
  exceptionInstant,
  isCancelledException,
  remainderMasterId,
  reprojectMaster,
} from "@sync/domain/series-exception.util";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import { type ProviderEvent } from "@sync/providers/provider-event.port";
import {
  type ProviderEventWriter,
  ProviderWriteError,
  type ProviderWriteRecurrence,
  type ProviderWriteResult,
} from "@sync/providers/provider-event-writer.port";
import { type CommandRecord } from "@sync/storage/contracts/command.contracts";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";
import { type DeletionMarkerRepository } from "@sync/storage/repositories/deletion-marker.repository";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";

// The slice of credential custody the executor needs — a valid access token for
// a connection, plus discard of a provider-invalidated grant. Narrow so tests
// pass a plain fake; CredentialCustody satisfies it structurally.
export interface AccessTokenSource {
  getValidAccessToken(connectionId: ConnectionId): Promise<string>;
  discardRevoked(connectionId: ConnectionId): Promise<void>;
}

export interface ProviderMutationDeps {
  commands: CommandRepository;
  events: EventRepository;
  // The derived occurrence projection, rebuilt (or cleared, on delete) so a
  // provider-linked event appears in range queries.
  occurrences: EventOccurrenceRepository;
  writer: ProviderEventWriter;
  custody: AccessTokenSource;
}

// Delete also needs the deletion-marker store for the tombstone.
export interface ProviderDeleteDeps extends ProviderMutationDeps {
  markers: DeletionMarkerRepository;
}

// Execute a Compass-initiated create against the owning provider, then commit.
// The deterministic providerEventId (= the command's event id) makes the
// provider create idempotent: a replay finds the id already present and the
// adapter reads it back, so a retry after a crash converges without a separate
// reconciliation step. Provider identity is committed to the canonical event
// BEFORE the command is confirmed, so a crash between the two re-runs harmlessly
// and the command is never confirmed from a write we didn't record — the
// executor confirms only from a definitive provider result.
export async function executeProviderCreate(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  calendar: ProviderCalendarRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "create") {
    throw new Error("executeProviderCreate requires a create command");
  }
  const { input } = command;

  let accessToken: string;
  try {
    accessToken = await deps.custody.getValidAccessToken(calendar.connectionId);
  } catch (error) {
    // A transient refresh failure is retryable, so leave the command pending; a
    // revoked or missing credential is terminal.
    if (
      error instanceof ProviderAuthError &&
      error.reason === "refreshFailed"
    ) {
      return command;
    }
    return failCommand(
      deps,
      command,
      "authorizationRevoked",
      calendar.connectionId,
    );
  }

  let result: ProviderWriteResult;
  try {
    result = await deps.writer.createEvent({
      accessToken,
      calendarId: calendar.providerCalendarId,
      providerEventId: command.eventId,
      content: input.content,
      schedule: input.schedule,
      recurrence: toProviderWriteRecurrence(input.recurrence),
      invitation: input.invitation,
    });
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      // Transient failures are safe to retry — the deterministic id keeps the
      // eventual retry idempotent. Every other reason is terminal and maps
      // straight to a command failure class.
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, calendar.connectionId);
    }
    throw error;
  }

  // Commit the provider identity to the canonical event and project its
  // occurrences, then confirm. Both run before confirmation, so a crash leaves
  // the command pending and a retry re-runs them idempotently.
  const record = buildLinkedEventRecord(command, calendar, result, now());
  await deps.events.put(record);
  await reprojectOccurrences(deps.occurrences, record, now);

  const confirmed = await deps.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    {
      state: "confirmed",
      providerEventId: result.providerEventId as ProviderEventId,
      providerVersion: result.providerVersion as ProviderEventVersion,
    },
    command.attemptCount,
  );
  return confirmed ?? command;
}

async function failCommand(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  reason: SyncCommandFailureReason,
  connectionId: ConnectionId,
): Promise<CommandRecord> {
  const failed = await deps.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    { state: "failed", failureReason: reason },
    command.attemptCount,
  );
  if (reason === "authorizationRevoked") {
    await deps.custody.discardRevoked(connectionId);
  }
  return failed ?? command;
}

// Build the canonical event for a provider-linked create: same shape as a cloud
// event but with the provider identity the write returned. calendarId stays the
// Sync provider-calendar id (how the command addressed it); the raw provider
// calendar id is only used for the API call.
function buildLinkedEventRecord(
  command: CommandRecord,
  calendar: ProviderCalendarRecord,
  result: ProviderWriteResult,
  now: Date,
): EventRecord {
  if (command.input.kind !== "create") {
    throw new Error("buildLinkedEventRecord requires a create command");
  }
  const { input } = command;
  return {
    _id: command.eventId,
    tenantId: command.tenantId,
    principalId: command.principalId,
    origin: "compass",
    calendarId: input.calendarId,
    clientEventId: input.clientEventId,
    connectionId: calendar.connectionId,
    providerEventId: result.providerEventId as ProviderEventId,
    providerVersion: result.providerVersion as ProviderEventVersion,
    // The write result carries no provider update time; a later read sets it.
    providerUpdatedAt: null,
    deliveryState: "confirmed",
    providerMetadata: null,
    content: omitNullColor(input.content),
    schedule: input.schedule,
    recurrence:
      input.recurrence.kind === "series"
        ? { kind: "seriesMaster", rules: input.recurrence.rules }
        : { kind: "single" },
    lifecycleState: "active",
    // generation 0 is correct in steady state (a calendar's active generation is
    // 0 until a repair bumps it). The one gap it leaves is self-healing: if a
    // repair has already advanced this calendar's active generation, a just-
    // created event's occurrences land at generation 0 and reads (which serve
    // the active generation) miss it — until the next incremental pull, which
    // re-reads this event from the provider (it IS at the provider, linked here)
    // and reprojects it at the active generation. Repairs are rare and pulls are
    // frequent, so the window is small and closes on its own; resolving the
    // active generation here would thread a resources dependency through the
    // whole command path for a case that corrects itself.
    generation: 0,
    createdAt: now,
    updatedAt: now,
    confirmedAt: now,
  };
}

// The provider write port takes the same single|series shape the editable
// recurrence already carries (unlike the stored form, which renames series to
// seriesMaster), so this is a near-identity mapping kept explicit for clarity.
function toProviderWriteRecurrence(
  recurrence: EditableRecurrence,
): ProviderWriteRecurrence {
  return recurrence.kind === "series"
    ? { kind: "series", rules: recurrence.rules }
    : { kind: "single" };
}

// Apply a Compass-initiated update to an existing provider-linked event.
//
// Replay safety is the hard part: a successful conditional patch changes the
// provider version, so a naive crash-then-retry would re-send the now-stale
// expected version and the provider would reject it as a conflict — misreporting
// an edit that actually landed. So we FETCH the provider's current state first:
// if it already carries this command's intended content, the edit landed on a
// prior attempt and we simply confirm at the current version (no second write).
// Otherwise we patch conditionally; the If-Match precondition turns a genuine
// concurrent external edit into a versionConflict. The content check only gates
// the replay shortcut, so a false miss falls through to the conditional patch
// (a spurious conflict at worst — never a lost external edit).
export async function executeProviderUpdate(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  event: EventRecord,
  calendar: ProviderCalendarRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "update") {
    throw new Error("executeProviderUpdate requires an update command");
  }
  if (!event.connectionId || !event.providerEventId) {
    throw new Error("executeProviderUpdate requires a linked event");
  }
  const { input } = command;
  const providerEventId = event.providerEventId;
  const connectionId = event.connectionId;

  let accessToken: string;
  try {
    accessToken = await deps.custody.getValidAccessToken(connectionId);
  } catch (error) {
    if (
      error instanceof ProviderAuthError &&
      error.reason === "refreshFailed"
    ) {
      return command;
    }
    return failCommand(deps, command, "authorizationRevoked", connectionId);
  }

  const location = {
    accessToken,
    calendarId: calendar.providerCalendarId,
    providerEventId,
  };

  // Fetch current provider state to detect a replay (our edit already landed)
  // and to learn the version to commit.
  let current: ProviderEvent | null;
  try {
    const read = await deps.writer.fetchEvent(location);
    // A cancellation read means the event no longer exists as a content event —
    // there is nothing to update.
    current = read?.kind === "event" ? read : null;
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }
  if (!current) {
    return failCommand(deps, command, "permanentProviderError", connectionId);
  }

  // Merge so a title/description edit cannot wipe provider-sourced attendees.
  const content = mergeUpdateContent(event.content, input.content);
  // Almost always "single" (event.recurrence.kind is single here, so
  // "preserve" resolves to single via intendedSeriesRecurrence's own
  // fallback) — except a single→series conversion, which writes real rules.
  const intendedRecurrence = intendedSeriesRecurrence(input.recurrence, event);

  // Replay: the provider already holds this edit, so confirm at its version
  // rather than writing again.
  if (
    matchesIntendedEdit(current, content, input.schedule, intendedRecurrence)
  ) {
    return commitProviderUpdate(
      deps,
      command,
      event,
      content,
      current.providerVersion,
      now,
    );
  }

  let result: ProviderWriteResult;
  try {
    result = await deps.writer.patchEvent({
      ...location,
      expectedVersion: command.expectedVersion,
      content,
      schedule: input.schedule,
      recurrence: intendedRecurrence,
      invitation: input.invitation,
    });
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }

  return commitProviderUpdate(
    deps,
    command,
    event,
    content,
    result.providerVersion,
    now,
  );
}

// Commit an updated provider event: write the new content/version to the
// canonical record (owner-scoped, non-upsert so a concurrent delete is not
// resurrected), then confirm. A miss means the local event vanished mid-flight,
// so leave the command pending to re-evaluate rather than confirm a gone event.
// recurrence is recomputed (not left as event.recurrence) so a single→series
// conversion actually persists its new rules locally, not just at the provider.
async function commitProviderUpdate(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  event: EventRecord,
  content: SyncEventContent,
  providerVersion: string,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "update") {
    throw new Error("commitProviderUpdate requires an update command");
  }
  const { input } = command;
  const updated: EventRecord = {
    ...event,
    content,
    schedule: input.schedule,
    recurrence: storedSeriesRecurrence(input.recurrence, event),
    providerVersion: providerVersion as ProviderEventVersion,
    providerUpdatedAt: null,
    deliveryState: "confirmed",
    updatedAt: now(),
  };
  const applied = await deps.events.replaceExisting(updated);
  if (!applied) return command;
  await reprojectOccurrences(deps.occurrences, updated, now);

  const confirmed = await deps.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    {
      state: "confirmed",
      providerEventId: event.providerEventId as ProviderEventId,
      providerVersion: providerVersion as ProviderEventVersion,
    },
    command.attemptCount,
  );
  return confirmed ?? command;
}

// Apply a Compass-initiated scope-"all" edit to a provider-linked recurring
// series — Google's "edit all events in the series". The master is patched with
// the new content, schedule, AND recurrence rules, and its per-instance
// overrides fall away. Kept separate from executeProviderUpdate because the
// local commit is series-aware: it discards override exceptions but preserves
// cancelled tombstones (a deletion must survive an edit) and reprojects the
// master excluding their instants.
//
// Replay safety mirrors the single-event path: fetch the provider's current
// master first; if it already carries this edit (content, schedule, and rules),
// a prior attempt landed, so confirm at the current version without re-writing.
// Otherwise patch conditionally on the command's expected version, turning a
// genuine concurrent external edit into a versionConflict.
export async function executeProviderSeriesUpdate(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  master: EventRecord,
  calendar: ProviderCalendarRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "update") {
    throw new Error("executeProviderSeriesUpdate requires an update command");
  }
  if (!master.connectionId || !master.providerEventId) {
    throw new Error("executeProviderSeriesUpdate requires a linked event");
  }
  if (master.recurrence.kind !== "seriesMaster") {
    throw new Error("executeProviderSeriesUpdate requires a series master");
  }
  const { input } = command;
  const connectionId = master.connectionId;
  const providerEventId = master.providerEventId;
  const intendedRecurrence = intendedSeriesRecurrence(input.recurrence, master);

  let accessToken: string;
  try {
    accessToken = await deps.custody.getValidAccessToken(connectionId);
  } catch (error) {
    if (
      error instanceof ProviderAuthError &&
      error.reason === "refreshFailed"
    ) {
      return command;
    }
    return failCommand(deps, command, "authorizationRevoked", connectionId);
  }

  const location = {
    accessToken,
    calendarId: calendar.providerCalendarId,
    providerEventId,
  };

  // Fetch the master's current provider state to detect a replay and learn the
  // version to commit. A cancellation read means the series no longer exists.
  let current: ProviderEvent | null;
  try {
    const read = await deps.writer.fetchEvent(location);
    current = read?.kind === "event" ? read : null;
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }
  if (!current) {
    return failCommand(deps, command, "permanentProviderError", connectionId);
  }

  const content = mergeUpdateContent(master.content, input.content);

  // Replay: the provider already holds this series edit (rules included), so
  // confirm at its version rather than writing again.
  if (
    matchesIntendedEdit(current, content, input.schedule, intendedRecurrence)
  ) {
    return commitProviderSeriesUpdate(
      deps,
      command,
      master,
      content,
      current.providerVersion,
      now,
    );
  }

  let result: ProviderWriteResult;
  try {
    result = await deps.writer.patchEvent({
      ...location,
      expectedVersion: command.expectedVersion,
      content,
      schedule: input.schedule,
      recurrence: intendedRecurrence,
      invitation: input.invitation,
    });
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }

  return commitProviderSeriesUpdate(
    deps,
    command,
    master,
    content,
    result.providerVersion,
    now,
  );
}

// Commit a provider series edit-all locally after the provider write lands.
// An edit-all discards per-instance content/time OVERRIDES (they revert to the
// edited series) but KEEPS cancelled tombstones, whose instants are excluded
// from the reprojected master so a deleted occurrence is not resurrected. A
// conversion to a single event drops every exception.
//
// Overrides are deleted BEFORE the master is replaced, on purpose — the same
// crash-safety ordering the cloud path uses. A convert-to-single edit changes
// the master's recurrence kind, and a retry that read the converted single
// master would take the single-event path, which never cleans exceptions;
// clearing first closes that hole. Gating the kept/discarded split on the
// command's immutable recurrence intent keeps a retry classifying identically.
// A false from replaceExisting means the master vanished mid-flight, so leave
// the command pending rather than confirm a gone series.
async function commitProviderSeriesUpdate(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  master: EventRecord,
  content: SyncEventContent,
  providerVersion: string,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "update") {
    throw new Error("commitProviderSeriesUpdate requires an update command");
  }
  const { input } = command;
  const convertsToSingle = input.recurrence.kind === "single";
  const exceptions = await deps.events.findSeriesExceptions(
    command.tenantId,
    command.principalId,
    master._id,
  );
  const kept = convertsToSingle ? [] : exceptions.filter(isCancelledException);
  const discarded = convertsToSingle
    ? exceptions
    : exceptions.filter((exception) => !isCancelledException(exception));

  // Clear each discarded override's occurrences, then remove it. (Twin of the
  // cloud path's deleteExceptions — kept local so the working cloud path is
  // untouched; both are a plain occurrence-clear-then-delete loop.)
  //
  // Deferred gap: for a provider-linked series this removes only the LOCAL copy
  // of the override, not the override event at the provider — patching a Google
  // master does not delete its instance overrides. An edit-all must also cancel
  // the discarded overrides at the provider, or a later pull could resurrect
  // them. (Provider series delete cascades local exceptions in
  // executeProviderDelete; edit-all still needs the provider cancel.)
  for (const exception of discarded) {
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

  const updated: EventRecord = {
    ...master,
    content,
    schedule: input.schedule,
    recurrence: storedSeriesRecurrence(input.recurrence, master),
    providerVersion: providerVersion as ProviderEventVersion,
    providerUpdatedAt: null,
    deliveryState: "confirmed",
    updatedAt: now(),
  };
  const applied = await deps.events.replaceExisting(updated);
  if (!applied) return command;
  await reprojectOccurrences(
    deps.occurrences,
    updated,
    now,
    kept.map(exceptionInstant),
  );

  const confirmed = await deps.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    {
      state: "confirmed",
      providerEventId: master.providerEventId as ProviderEventId,
      providerVersion: providerVersion as ProviderEventVersion,
    },
    command.attemptCount,
  );
  return confirmed ?? command;
}

// ---------------------------------------------------------------------------
// Provider-linked recurring scopes "this" and "thisAndFollowing".
//
// A this/thisAndFollowing scope operates on ONE instance of a provider series,
// which — unlike a cloud series exception — has no id of its own until
// resolved via writer.fetchInstanceAt. Every executor below: resolves the
// instance (or, for a split, patches the master directly), applies the same
// replay-safe fetch-then-compare pattern executeProviderUpdate/
// executeProviderSeriesUpdate already use, and commits locally through
// upsertException/reprojectMaster — the exact local-commit shape the cloud
// path's updateCloudOccurrence/deleteCloudOccurrence/*SeriesFollowing already
// use (series-exception.util.ts), so a provider-linked and a cloud-only
// series converge to the same on-disk shape.
//
// Known deferred gap, matching the documented one in
// commitProviderSeriesUpdate above: un-cancelling a provider instance (a
// scope-"this" edit of an instance the provider already reports as
// cancelled) is not implemented — it fails with permanentProviderError
// rather than silently no-op'ing. Restoring a cancelled Google instance to
// "confirmed" is a distinct provider operation this slice does not need for
// the common edit/delete-a-live-instance path.
// ---------------------------------------------------------------------------

// Apply a Compass-initiated scope-"this" edit to one occurrence of a
// provider-linked series: resolve the instance's own provider identity, then
// patch IT (never the master) — mirrors executeProviderUpdate's replay-safe
// fetch-then-compare, but against the resolved instance's location.
export async function executeProviderOccurrenceUpdate(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  master: EventRecord,
  calendar: ProviderCalendarRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "update" || command.input.recurrenceId === null) {
    throw new Error(
      "executeProviderOccurrenceUpdate requires a this-scope update command",
    );
  }
  if (!master.connectionId || !master.providerEventId) {
    throw new Error(
      "executeProviderOccurrenceUpdate requires a linked series master",
    );
  }
  if (master.recurrence.kind !== "seriesMaster") {
    throw new Error("executeProviderOccurrenceUpdate requires a series master");
  }
  const { input } = command;
  const recurrenceId = input.recurrenceId as DateTime;
  const connectionId = master.connectionId;
  const seriesProviderEventId = master.providerEventId;

  let accessToken: string;
  try {
    accessToken = await deps.custody.getValidAccessToken(connectionId);
  } catch (error) {
    if (
      error instanceof ProviderAuthError &&
      error.reason === "refreshFailed"
    ) {
      return command;
    }
    return failCommand(deps, command, "authorizationRevoked", connectionId);
  }

  let instance: ProviderEvent | null;
  try {
    const read = await deps.writer.fetchInstanceAt({
      accessToken,
      calendarId: calendar.providerCalendarId,
      seriesProviderEventId,
      originalStartAt: recurrenceId,
    });
    instance = read?.kind === "event" ? read : null;
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }
  // No live instance to override: never materialized at that instant, or
  // already cancelled at the provider (see the deferred-gap note above).
  if (!instance) {
    return failCommand(deps, command, "permanentProviderError", connectionId);
  }

  const content = mergeUpdateContent(master.content, input.content);
  const providerEventId = instance.providerEventId;
  const location = {
    accessToken,
    calendarId: calendar.providerCalendarId,
    providerEventId,
  };

  // An occurrence override is always a standalone provider event, never
  // itself carrying recurrence rules.
  if (
    matchesIntendedEdit(instance, content, input.schedule, { kind: "single" })
  ) {
    return commitProviderOccurrenceUpdate(
      deps,
      command,
      master,
      recurrenceId,
      content,
      providerEventId,
      instance.providerVersion,
      now,
    );
  }

  let result: ProviderWriteResult;
  try {
    result = await deps.writer.patchEvent({
      ...location,
      expectedVersion: command.expectedVersion,
      content,
      schedule: input.schedule,
      recurrence: { kind: "single" },
      invitation: input.invitation,
    });
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }

  return commitProviderOccurrenceUpdate(
    deps,
    command,
    master,
    recurrenceId,
    content,
    providerEventId,
    result.providerVersion,
    now,
  );
}

// Commit a provider occurrence override locally: upsert the exception
// carrying the INSTANCE's own provider identity (never the master's — see
// upsertException's providerIdentity param), reproject the master to exclude
// that instant, then project the exception's own occurrence.
async function commitProviderOccurrenceUpdate(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  master: EventRecord,
  recurrenceId: DateTime,
  content: SyncEventContent,
  providerEventId: string,
  providerVersion: string,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "update") {
    throw new Error(
      "commitProviderOccurrenceUpdate requires an update command",
    );
  }
  const exception = await deps.events.upsertException(
    master,
    recurrenceId,
    {
      content,
      schedule: command.input.schedule,
      cancelled: false,
      providerIdentity: {
        providerEventId: providerEventId as ProviderEventId,
        providerVersion: providerVersion as ProviderEventVersion,
      },
    },
    now(),
  );
  await reprojectMaster(deps, command, master, now);
  await reprojectOccurrences(deps.occurrences, exception, now);

  const confirmed = await deps.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    {
      state: "confirmed",
      providerEventId: providerEventId as ProviderEventId,
      providerVersion: providerVersion as ProviderEventVersion,
    },
    command.attemptCount,
  );
  return confirmed ?? command;
}

// Apply a Compass-initiated scope-"this" delete to one occurrence of a
// provider-linked series: resolve the instance, delete IT at the provider
// (Google represents this as cancelling that one instance — the series and
// every other instance are untouched), then cancel the local tombstone.
// Idempotent: an already-cancelled or never-materialized instance converges
// to the same local tombstone without a second provider call, mirroring how
// a whole-event delete treats an already-absent target as success.
export async function executeProviderOccurrenceDelete(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  master: EventRecord,
  calendar: ProviderCalendarRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "delete" || command.input.recurrenceId === null) {
    throw new Error(
      "executeProviderOccurrenceDelete requires a this-scope delete command",
    );
  }
  if (!master.connectionId || !master.providerEventId) {
    throw new Error(
      "executeProviderOccurrenceDelete requires a linked series master",
    );
  }
  if (master.recurrence.kind !== "seriesMaster") {
    throw new Error("executeProviderOccurrenceDelete requires a series master");
  }
  const { input } = command;
  const recurrenceId = input.recurrenceId as DateTime;
  const connectionId = master.connectionId;
  const seriesProviderEventId = master.providerEventId;

  let accessToken: string;
  try {
    accessToken = await deps.custody.getValidAccessToken(connectionId);
  } catch (error) {
    if (
      error instanceof ProviderAuthError &&
      error.reason === "refreshFailed"
    ) {
      return command;
    }
    return failCommand(deps, command, "authorizationRevoked", connectionId);
  }

  let instance: ProviderEvent | null;
  try {
    const read = await deps.writer.fetchInstanceAt({
      accessToken,
      calendarId: calendar.providerCalendarId,
      seriesProviderEventId,
      originalStartAt: recurrenceId,
    });
    instance = read?.kind === "event" ? read : null;
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }

  if (instance) {
    try {
      await deps.writer.deleteEvent({
        accessToken,
        calendarId: calendar.providerCalendarId,
        providerEventId: instance.providerEventId,
        // Unconditional, same rationale as the whole-event delete: cancelling
        // one instance is not conditioned on its version.
        expectedVersion: null,
        invitation: input.invitation,
      });
    } catch (error) {
      if (error instanceof ProviderWriteError) {
        if (error.reason === "transient") return command;
        return failCommand(deps, command, error.reason, connectionId);
      }
      throw error;
    }
  }

  const exception = await deps.events.upsertException(
    master,
    recurrenceId,
    {
      content: master.content,
      schedule: occurrenceScheduleAt(master.schedule, recurrenceId),
      cancelled: true,
      providerIdentity: instance
        ? {
            providerEventId: instance.providerEventId as ProviderEventId,
            providerVersion: instance.providerVersion as ProviderEventVersion,
          }
        : undefined,
    },
    now(),
  );
  await reprojectMaster(deps, command, master, now);
  await reprojectOccurrences(deps.occurrences, exception, now);

  const confirmed = await deps.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    // No live provider target for this command once the instance is
    // cancelled — same shape confirmDeletion uses for a whole-event delete.
    { state: "confirmed", providerEventId: null, providerVersion: null },
    command.attemptCount,
  );
  return confirmed ?? command;
}

// Apply a Compass-initiated scope-"thisAndFollowing" delete to a
// provider-linked series: truncate the provider master's rules to end before
// the split (Google removes every instance from that point on), drop the
// local exceptions at/after it, and reproject. A split at the series' own
// first occurrence removes the whole series, so it collapses to the existing
// whole-series provider delete. Content/schedule are NOT part of this write —
// only recurrence changes — so the replay check and patch both hold the
// master's own content/schedule fixed.
export async function executeProviderSeriesFollowingDelete(
  deps: ProviderDeleteDeps,
  command: CommandRecord,
  master: EventRecord,
  calendar: ProviderCalendarRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "delete" || command.input.recurrenceId === null) {
    throw new Error(
      "executeProviderSeriesFollowingDelete requires a thisAndFollowing-scope delete command",
    );
  }
  if (!master.connectionId || !master.providerEventId) {
    throw new Error(
      "executeProviderSeriesFollowingDelete requires a linked series master",
    );
  }
  if (master.recurrence.kind !== "seriesMaster") {
    throw new Error(
      "executeProviderSeriesFollowingDelete requires a series master",
    );
  }
  const { input } = command;
  const connectionId = master.connectionId;
  const providerEventId = master.providerEventId;
  const splitAt = new Date(input.recurrenceId as DateTime);

  if (splitAt.getTime() <= scheduleStartAt(master.schedule).getTime()) {
    return executeProviderDelete(deps, command, master, calendar, now);
  }

  let accessToken: string;
  try {
    accessToken = await deps.custody.getValidAccessToken(connectionId);
  } catch (error) {
    if (
      error instanceof ProviderAuthError &&
      error.reason === "refreshFailed"
    ) {
      return command;
    }
    return failCommand(deps, command, "authorizationRevoked", connectionId);
  }

  await deleteFollowingExceptions(deps, command, master._id, splitAt);
  const truncatedRules = truncateRulesBefore(master.recurrence.rules, splitAt);
  const location = {
    accessToken,
    calendarId: calendar.providerCalendarId,
    providerEventId,
  };

  let current: ProviderEvent | null;
  try {
    const read = await deps.writer.fetchEvent(location);
    current = read?.kind === "event" ? read : null;
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }
  if (!current) {
    return failCommand(deps, command, "permanentProviderError", connectionId);
  }

  const truncateRecurrence: ProviderWriteRecurrence = {
    kind: "series",
    rules: truncatedRules,
  };
  if (
    matchesIntendedEdit(
      current,
      master.content,
      master.schedule,
      truncateRecurrence,
    )
  ) {
    return commitProviderSeriesFollowingDelete(
      deps,
      command,
      master,
      truncatedRules,
      current.providerVersion,
      now,
    );
  }

  let result: ProviderWriteResult;
  try {
    result = await deps.writer.patchEvent({
      ...location,
      expectedVersion: command.expectedVersion,
      content: master.content,
      schedule: master.schedule,
      recurrence: truncateRecurrence,
      invitation: input.invitation,
    });
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }

  return commitProviderSeriesFollowingDelete(
    deps,
    command,
    master,
    truncatedRules,
    result.providerVersion,
    now,
  );
}

async function commitProviderSeriesFollowingDelete(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  master: EventRecord,
  truncatedRules: readonly string[],
  providerVersion: string,
  now: () => Date,
): Promise<CommandRecord> {
  const truncated: EventRecord = {
    ...master,
    recurrence: { kind: "seriesMaster", rules: truncatedRules },
    providerVersion: providerVersion as ProviderEventVersion,
    providerUpdatedAt: null,
    deliveryState: "confirmed",
    updatedAt: now(),
  };
  const applied = await deps.events.replaceExisting(truncated);
  if (!applied) return command;
  await reprojectMaster(deps, command, truncated, now);

  const confirmed = await deps.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    {
      state: "confirmed",
      providerEventId: master.providerEventId as ProviderEventId,
      providerVersion: providerVersion as ProviderEventVersion,
    },
    command.attemptCount,
  );
  return confirmed ?? command;
}

// Apply a Compass-initiated scope-"thisAndFollowing" EDIT to a provider-linked
// series by SPLITTING it, mirroring updateCloudSeriesFollowing: truncate the
// original master's rules at the provider (same as the delete twin above),
// then CREATE a new remainder series at the provider carrying the edit, at a
// deterministic provider event id so a retry converges on one remainder
// instead of duplicating it. A split at the series' own first occurrence
// edits the whole series, so it collapses to the existing provider edit-all.
export async function executeProviderSeriesFollowingUpdate(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  master: EventRecord,
  calendar: ProviderCalendarRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "update" || command.input.recurrenceId === null) {
    throw new Error(
      "executeProviderSeriesFollowingUpdate requires a thisAndFollowing-scope update command",
    );
  }
  if (!master.connectionId || !master.providerEventId) {
    throw new Error(
      "executeProviderSeriesFollowingUpdate requires a linked series master",
    );
  }
  if (master.recurrence.kind !== "seriesMaster") {
    throw new Error(
      "executeProviderSeriesFollowingUpdate requires a series master",
    );
  }
  const { input } = command;
  const connectionId = master.connectionId;
  const providerEventId = master.providerEventId;
  const splitAt = new Date(input.recurrenceId as DateTime);

  if (splitAt.getTime() <= scheduleStartAt(master.schedule).getTime()) {
    return executeProviderSeriesUpdate(deps, command, master, calendar, now);
  }

  let accessToken: string;
  try {
    accessToken = await deps.custody.getValidAccessToken(connectionId);
  } catch (error) {
    if (
      error instanceof ProviderAuthError &&
      error.reason === "refreshFailed"
    ) {
      return command;
    }
    return failCommand(deps, command, "authorizationRevoked", connectionId);
  }

  // Truncate the original master first — same ordering as the cloud path:
  // the worst transient state between this step and the remainder create
  // below is a momentary gap at the split, never a duplicate series.
  await deleteFollowingExceptions(deps, command, master._id, splitAt);
  const truncatedRules = truncateRulesBefore(master.recurrence.rules, splitAt);
  const originalLocation = {
    accessToken,
    calendarId: calendar.providerCalendarId,
    providerEventId,
  };

  let current: ProviderEvent | null;
  try {
    const read = await deps.writer.fetchEvent(originalLocation);
    current = read?.kind === "event" ? read : null;
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }
  if (!current) {
    return failCommand(deps, command, "permanentProviderError", connectionId);
  }

  const truncateRecurrence: ProviderWriteRecurrence = {
    kind: "series",
    rules: truncatedRules,
  };
  let originalVersion: string;
  if (
    matchesIntendedEdit(
      current,
      master.content,
      master.schedule,
      truncateRecurrence,
    )
  ) {
    originalVersion = current.providerVersion;
  } else {
    let truncateResult: ProviderWriteResult;
    try {
      truncateResult = await deps.writer.patchEvent({
        ...originalLocation,
        expectedVersion: command.expectedVersion,
        content: master.content,
        schedule: master.schedule,
        recurrence: truncateRecurrence,
        invitation: input.invitation,
      });
    } catch (error) {
      if (error instanceof ProviderWriteError) {
        if (error.reason === "transient") return command;
        return failCommand(deps, command, error.reason, connectionId);
      }
      throw error;
    }
    originalVersion = truncateResult.providerVersion;
  }

  const truncated: EventRecord = {
    ...master,
    recurrence: { kind: "seriesMaster", rules: truncatedRules },
    providerVersion: originalVersion as ProviderEventVersion,
    providerUpdatedAt: null,
    deliveryState: "confirmed",
    updatedAt: now(),
  };
  const appliedTruncate = await deps.events.replaceExisting(truncated);
  if (!appliedTruncate) return command;
  await reprojectMaster(deps, command, truncated, now);

  // "preserve" continues the original (pre-truncation) cadence, open-ended
  // from the split — mirroring buildRemainderMaster's own "preserve" case,
  // NOT intendedSeriesRecurrence's (which would re-write the already-bounded
  // rules the master just got truncated to).
  const remainderRecurrence: ProviderWriteRecurrence =
    input.recurrence.kind === "series"
      ? { kind: "series", rules: input.recurrence.rules }
      : input.recurrence.kind === "single"
        ? { kind: "single" }
        : { kind: "series", rules: stripRuleBounds(master.recurrence.rules) };
  const remainderId = remainderMasterId(
    master._id,
    input.recurrenceId as DateTime,
  );
  const remainderContent = mergeUpdateContent(master.content, input.content);

  let createResult: ProviderWriteResult;
  try {
    createResult = await deps.writer.createEvent({
      accessToken,
      calendarId: calendar.providerCalendarId,
      providerEventId: remainderId,
      content: remainderContent,
      schedule: input.schedule,
      recurrence: remainderRecurrence,
      invitation: input.invitation,
    });
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason, connectionId);
    }
    throw error;
  }

  const remainder: EventRecord = {
    ...master,
    _id: remainderId,
    clientEventId: null,
    providerEventId: createResult.providerEventId as ProviderEventId,
    providerVersion: createResult.providerVersion as ProviderEventVersion,
    providerUpdatedAt: null,
    deliveryState: "confirmed",
    content: remainderContent,
    schedule: input.schedule,
    recurrence:
      remainderRecurrence.kind === "series"
        ? { kind: "seriesMaster", rules: remainderRecurrence.rules }
        : { kind: "single" },
    createdAt: now(),
    updatedAt: now(),
    confirmedAt: now(),
  };
  await deps.events.put(remainder);
  await reprojectOccurrences(deps.occurrences, remainder, now);

  const confirmed = await deps.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    {
      state: "confirmed",
      providerEventId: createResult.providerEventId as ProviderEventId,
      providerVersion: createResult.providerVersion as ProviderEventVersion,
    },
    command.attemptCount,
  );
  return confirmed ?? command;
}

// The provider recurrence a series edit-all writes. "series" sets new rules;
// "single" removes recurrence (converting the series to one event); "preserve"
// re-writes the master's current rules unchanged (harmless, keeps the write
// self-describing).
function intendedSeriesRecurrence(
  recurrence: RecurrenceEdit,
  master: EventRecord,
): ProviderWriteRecurrence {
  if (recurrence.kind === "series") {
    return { kind: "series", rules: recurrence.rules };
  }
  if (recurrence.kind === "single") return { kind: "single" };
  return master.recurrence.kind === "seriesMaster"
    ? { kind: "series", rules: master.recurrence.rules }
    : { kind: "single" };
}

// The stored recurrence a series edit-all applies to the local master, mirroring
// intendedSeriesRecurrence in the canonical event's own union.
function storedSeriesRecurrence(
  recurrence: RecurrenceEdit,
  master: EventRecord,
): SyncEventRecurrence {
  if (recurrence.kind === "series") {
    return { kind: "seriesMaster", rules: recurrence.rules };
  }
  if (recurrence.kind === "single") return { kind: "single" };
  return master.recurrence;
}

// isCancelledException / exceptionInstant now come from
// series-exception.util.ts, shared with the cloud path.

// Whether the provider's current event already carries this command's intended
// edit — the signal that a prior attempt landed and this is a safe replay.
// Compares ONLY the fields a patch actually writes (title, description,
// location, color, schedule, recurrence). organizer/attendees/conference are
// read-reflected, not written by the provider adapter, so they drift
// independently (e.g. an attendee RSVPs) — comparing them would turn a landed
// edit into a false miss, then a stale-version patch, then a spurious
// versionConflict on a write that already succeeded. Recurrence IS written (a
// series edit-all changes the rules), so it must be compared: a rules-only edit
// leaves content and schedule identical, and without this a false replay would
// confirm the command without ever writing the new rules. Used only to detect a
// replay, so a false negative on the compared fields is still safe (it falls
// through to the conditional patch).
function matchesIntendedEdit(
  current: ProviderEvent,
  content: SyncEventContent,
  schedule: EventSchedule,
  recurrence: ProviderWriteRecurrence,
): boolean {
  // Null on the command means "no color"; treat it like an absent color on
  // the provider read so a clear that already landed counts as a replay.
  const intendedColor = content.color === null ? undefined : content.color;
  return (
    current.content.title === content.title &&
    current.content.description === content.description &&
    current.content.location === content.location &&
    current.content.color === intendedColor &&
    deepEqual(current.schedule, schedule) &&
    recurrenceMatches(current.recurrence, recurrence)
  );
}

// Whether the provider's reported recurrence matches the recurrence a write
// would set. A single write expects a non-recurring event; a series write
// expects the same rules the provider now reports on its master.
//
// Rules are compared canonically, not byte-for-byte. A provider can echo a rule
// it stored in a reformatted-but-equivalent form (reordered components,
// different casing), so an exact compare would false-miss a landed edit — and
// because this gates a replay, that miss would re-patch with a now-stale
// expected version and fail a write that already succeeded, leaving the local
// event diverged from the provider. Canonicalizing absorbs that cosmetic drift;
// genuinely different rules still differ, so this never widens a real change
// into a false match. Named wart: an exotic reformatting the canonicalization
// misses (e.g. a provider injecting a non-default WKST we never sent) can still
// false-miss — acceptable because Compass emits simple rules and the only
// consequence is a spurious conflict in the narrow landed-then-retried window.
function recurrenceMatches(
  current: ProviderEvent["recurrence"],
  intended: ProviderWriteRecurrence,
): boolean {
  if (intended.kind === "single") return current.kind === "single";
  if (current.kind !== "seriesMaster") return false;
  if (current.rules.length !== intended.rules.length) return false;
  const currentCanonical = current.rules.map(canonicalRule).sort();
  const intendedCanonical = intended.rules.map(canonicalRule).sort();
  return currentCanonical.every(
    (rule, index) => rule === intendedCanonical[index],
  );
}

// A rule normalized for equality: uppercased, its optional RRULE: prefix
// dropped, and its ;-separated components sorted. This makes the comparison
// order- and case-insensitive without a full RRULE parse (which would drag in
// dtstart defaulting and reformatting of its own).
function canonicalRule(rule: string): string {
  return rule
    .trim()
    .toUpperCase()
    .replace(/^RRULE:/, "")
    .split(";")
    .filter((part) => part.length > 0)
    .sort()
    .join(";");
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  );
}

// Delete a Compass-initiated provider event. The event is marked deletionPending
// (so it reads as "deleting" while the command is in flight or retrying) BEFORE
// the provider is asked, and its local content is removed only AFTER the
// provider confirms — never delete content before provider confirmation. The
// delete is unconditional: the user's intent to cancel does not hinge on a
// version, and a routine attendee RSVP must not block it. Idempotent: the
// adapter treats an already-absent event as deleted, and the marker + local
// delete are both idempotent, so a retry after a crash converges.
export async function executeProviderDelete(
  deps: ProviderDeleteDeps,
  command: CommandRecord,
  event: EventRecord,
  calendar: ProviderCalendarRecord,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "delete") {
    throw new Error("executeProviderDelete requires a delete command");
  }
  if (!event.connectionId || !event.providerEventId) {
    throw new Error("executeProviderDelete requires a linked event");
  }
  const { input } = command;
  const connectionId = event.connectionId;
  const providerEventId = event.providerEventId;

  // Mark the event as being deleted. If it is already gone locally, a prior
  // attempt removed it (the marker was written first) — the delete converged.
  // Still cascade any leftover series exceptions: older builds removed the
  // master without clearing overrides, and a crash between exception cleanup
  // and confirm can leave the same residue.
  const marked = await deps.events.replaceExisting({
    ...event,
    lifecycleState: "deletionPending",
    updatedAt: now(),
  });
  if (!marked) {
    await clearSeriesExceptions(deps, command, command.eventId);
    return confirmDeletion(deps, command);
  }

  let accessToken: string;
  try {
    accessToken = await deps.custody.getValidAccessToken(connectionId);
  } catch (error) {
    if (
      error instanceof ProviderAuthError &&
      error.reason === "refreshFailed"
    ) {
      return command;
    }
    return revertAndFail(
      deps,
      command,
      event,
      "authorizationRevoked",
      connectionId,
      now,
    );
  }

  try {
    await deps.writer.deleteEvent({
      accessToken,
      calendarId: calendar.providerCalendarId,
      providerEventId,
      // Unconditional: a cancellation is not conditioned on the version, so an
      // unrelated external change never blocks it.
      expectedVersion: null,
      invitation: input.invitation,
    });
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      // Transient: keep the event deletionPending (visibly deleting) and retry.
      if (error.reason === "transient") return command;
      // Terminal: the delete failed, so restore the event to active rather than
      // leaving it stuck showing "deleting".
      return revertAndFail(
        deps,
        command,
        event,
        error.reason,
        connectionId,
        now,
      );
    }
    throw error;
  }

  // The provider confirmed the deletion. Write the content-free tombstone first
  // (so no window exists where the event is gone with no marker), clear the
  // master's occurrences, cascade local series exceptions (Google-side instance
  // overrides), then remove the master LAST — same crash-safety as the cloud
  // series delete / pull cascade. Clearing before deleteById matters: a crash
  // after deleteById would otherwise strand occurrence rows, since the retry's
  // already-gone (`!marked`) branch confirms without ever clearing them.
  await deps.markers.record({
    tenantId: event.tenantId,
    principalId: event.principalId,
    connectionId,
    calendarId: event.calendarId,
    providerEventId,
    providerVersion: event.providerVersion,
    deletionSource: "compass",
    deletedAt: now(),
  });
  await deps.occurrences.replaceForEvent(event._id, event.generation, []);
  await clearSeriesExceptions(deps, command, event._id);
  await deps.events.deleteById(event.tenantId, event.principalId, event._id);
  return confirmDeletion(deps, command);
}

// Remove every local exception of a series (occurrences first). Idempotent:
// findSeriesExceptions is empty when the target was a single event or when a
// prior attempt already cleared overrides. Does not call the provider — Google
// series delete already discarded the instances with the master.
async function clearSeriesExceptions(
  deps: ProviderDeleteDeps,
  command: CommandRecord,
  seriesId: EventId,
): Promise<void> {
  const exceptions = await deps.events.findSeriesExceptions(
    command.tenantId,
    command.principalId,
    seriesId,
  );
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

// Confirm a completed deletion: the event has no live provider target anymore,
// so the confirmed outcome carries no provider identity.
async function confirmDeletion(
  deps: ProviderMutationDeps,
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

// Restore a deletionPending event to active, then fail the command. A failed
// delete must not leave the event stuck reading as "deleting". The revert write
// is NOT wrapped in a catch: replaceExisting signals the benign "already gone"
// case with a resolved false (not a throw), so a throw here is a real error —
// letting it propagate keeps the command pending (not falsely failed) and
// retryable, rather than marking it terminally failed with a stuck event.
async function revertAndFail(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  event: EventRecord,
  reason: SyncCommandFailureReason,
  connectionId: ConnectionId,
  now: () => Date,
): Promise<CommandRecord> {
  await deps.events.replaceExisting({
    ...event,
    lifecycleState: "active",
    updatedAt: now(),
  });
  return failCommand(deps, command, reason, connectionId);
}
