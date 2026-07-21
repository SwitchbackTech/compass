import { type EditableRecurrence } from "@core/types/event.contracts";
import { type SyncEventRecurrence } from "@core/types/sync/event.contracts";
import { type ProviderCalendarId } from "@core/types/sync/identity.contracts";
import { type SyncExecutionMode } from "@sync/config/sync.config";
import { type CredentialCustody } from "@sync/credentials/credential-custody.service";
import {
  executeProviderCreate,
  executeProviderUpdate,
} from "@sync/domain/provider-command.service";
import { type ProviderEventWriter } from "@sync/providers/provider-event-writer.port";
import {
  type CommandRecord,
  type CommandSubmit,
} from "@sync/storage/contracts/command.contracts";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";

export interface CloudCommandDeps {
  commands: CommandRepository;
  events: EventRepository;
  calendars: ProviderCalendarRepository;
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
): Promise<CommandRecord> {
  const command = await deps.commands.submit(submit);

  // Only a freshly-persisted create is applied here. A command already past
  // pending (a confirmed replay, or a kind we don't apply yet) is returned as
  // it stands, so a repeated submit never re-applies or overwrites an outcome.
  if (command.outcome.state !== "pending") return command;

  // update/delete apply to an existing event; move is not handled yet.
  if (command.input.kind === "update" || command.input.kind === "delete") {
    return applyCloudMutation(deps, command, now);
  }
  if (command.input.kind !== "create") return command;

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
      return executeProviderCreate(
        {
          commands: deps.commands,
          events: deps.events,
          writer: deps.provider.writer,
          custody: deps.provider.custody,
        },
        command,
        providerCalendar,
        now,
      );
    }
    return command;
  }

  await deps.events.put(buildCloudEventRecord(command, now()));
  return confirmCloud(deps, command);
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
    if (existing.connectionId !== null) return command;
    if (existing.recurrence.kind !== "single") return command;
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
  // A recurring series needs scope handling (later slice), and converting a
  // single event into a series is itself a series edit — defer both. Gating on
  // the command's intent (not the event's post-write recurrence) keeps a retry
  // converging: the applied update never changes recurrence.kind here.
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
  const applied = await deps.events.replaceExisting(
    applyCloudUpdate(existing, command, now()),
  );
  if (!applied) return command;
  return confirmCloud(deps, command);
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
// current recurrence; "single"/"series" set it.
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
    content: input.content,
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
    content: input.content,
    schedule: input.schedule,
    recurrence: toStoredRecurrence(input.recurrence),
    lifecycleState: "active",
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
