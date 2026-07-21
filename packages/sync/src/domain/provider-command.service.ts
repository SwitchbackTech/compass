import {
  type EditableRecurrence,
  type EventSchedule,
} from "@core/types/event.contracts";
import { type SyncCommandFailureReason } from "@core/types/sync/command.contracts";
import {
  type ProviderEventVersion,
  type SyncEventContent,
} from "@core/types/sync/event.contracts";
import {
  type ConnectionId,
  type ProviderEventId,
} from "@core/types/sync/identity.contracts";
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

// The slice of credential custody the executor needs — a valid access token for
// a connection. Narrow so tests pass a plain fake; CredentialCustody satisfies
// it structurally.
export interface AccessTokenSource {
  getValidAccessToken(connectionId: ConnectionId): Promise<string>;
}

export interface ProviderMutationDeps {
  commands: CommandRepository;
  events: EventRepository;
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
    return failCommand(deps, command, "authorizationRevoked");
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
      return failCommand(deps, command, error.reason);
    }
    throw error;
  }

  // Commit the provider identity to the canonical event, then confirm.
  await deps.events.put(
    buildLinkedEventRecord(command, calendar, result, now()),
  );

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
): Promise<CommandRecord> {
  const failed = await deps.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    { state: "failed", failureReason: reason },
    command.attemptCount,
  );
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
    content: input.content,
    schedule: input.schedule,
    recurrence:
      input.recurrence.kind === "series"
        ? { kind: "seriesMaster", rules: input.recurrence.rules }
        : { kind: "single" },
    lifecycleState: "active",
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
    return failCommand(deps, command, "authorizationRevoked");
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
      return failCommand(deps, command, error.reason);
    }
    throw error;
  }
  if (!current) return failCommand(deps, command, "permanentProviderError");

  // Replay: the provider already holds this edit, so confirm at its version
  // rather than writing again.
  if (matchesIntendedEdit(current, input.content, input.schedule)) {
    return commitProviderUpdate(
      deps,
      command,
      event,
      current.providerVersion,
      now,
    );
  }

  let result: ProviderWriteResult;
  try {
    result = await deps.writer.patchEvent({
      ...location,
      expectedVersion: command.expectedVersion,
      content: input.content,
      schedule: input.schedule,
      recurrence: { kind: "single" },
      invitation: input.invitation,
    });
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") return command;
      return failCommand(deps, command, error.reason);
    }
    throw error;
  }

  return commitProviderUpdate(
    deps,
    command,
    event,
    result.providerVersion,
    now,
  );
}

// Commit an updated provider event: write the new content/version to the
// canonical record (owner-scoped, non-upsert so a concurrent delete is not
// resurrected), then confirm. A miss means the local event vanished mid-flight,
// so leave the command pending to re-evaluate rather than confirm a gone event.
async function commitProviderUpdate(
  deps: ProviderMutationDeps,
  command: CommandRecord,
  event: EventRecord,
  providerVersion: string,
  now: () => Date,
): Promise<CommandRecord> {
  if (command.input.kind !== "update") {
    throw new Error("commitProviderUpdate requires an update command");
  }
  const { input } = command;
  const applied = await deps.events.replaceExisting({
    ...event,
    content: input.content,
    schedule: input.schedule,
    providerVersion: providerVersion as ProviderEventVersion,
    providerUpdatedAt: null,
    deliveryState: "confirmed",
    updatedAt: now(),
  });
  if (!applied) return command;

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

// Whether the provider's current event already carries this command's intended
// edit — the signal that a prior attempt landed and this is a safe replay.
// Compares ONLY the fields a patch actually writes (title, description,
// location, schedule). organizer/attendees/conference are read-reflected, not
// written by the provider adapter, so they drift independently (e.g. an
// attendee RSVPs) — comparing them would turn a landed edit into a false miss,
// then a stale-version patch, then a spurious versionConflict on a write that
// already succeeded. Used only to detect a replay, so a false negative on the
// compared fields is still safe (it falls through to the conditional patch).
function matchesIntendedEdit(
  current: ProviderEvent,
  content: SyncEventContent,
  schedule: EventSchedule,
): boolean {
  return (
    current.content.title === content.title &&
    current.content.description === content.description &&
    current.content.location === content.location &&
    deepEqual(current.schedule, schedule)
  );
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
  const marked = await deps.events.replaceExisting({
    ...event,
    lifecycleState: "deletionPending",
    updatedAt: now(),
  });
  if (!marked) return confirmDeletion(deps, command);

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
    return revertAndFail(deps, command, event, "authorizationRevoked", now);
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
      return revertAndFail(deps, command, event, error.reason, now);
    }
    throw error;
  }

  // The provider confirmed the deletion. Write the content-free tombstone first
  // (so no window exists where the event is gone with no marker), then remove
  // the local record, then confirm. All three are idempotent.
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
  await deps.events.deleteById(event.tenantId, event.principalId, event._id);
  return confirmDeletion(deps, command);
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
  now: () => Date,
): Promise<CommandRecord> {
  await deps.events.replaceExisting({
    ...event,
    lifecycleState: "active",
    updatedAt: now(),
  });
  return failCommand(deps, command, reason);
}
