import { type EditableRecurrence } from "@core/types/event.contracts";
import { type SyncCommandFailureReason } from "@core/types/sync/command.contracts";
import { type ProviderEventVersion } from "@core/types/sync/event.contracts";
import {
  type ConnectionId,
  type ProviderEventId,
} from "@core/types/sync/identity.contracts";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
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
import { type EventRepository } from "@sync/storage/repositories/event.repository";

// The slice of credential custody the executor needs — a valid access token for
// a connection. Narrow so tests pass a plain fake; CredentialCustody satisfies
// it structurally.
export interface AccessTokenSource {
  getValidAccessToken(connectionId: ConnectionId): Promise<string>;
}

export interface ProviderCreateDeps {
  commands: CommandRepository;
  events: EventRepository;
  writer: ProviderEventWriter;
  custody: AccessTokenSource;
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
  deps: ProviderCreateDeps,
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
  deps: ProviderCreateDeps,
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
