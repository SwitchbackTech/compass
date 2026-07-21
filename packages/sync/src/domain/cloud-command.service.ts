import { type EditableRecurrence } from "@core/types/event.contracts";
import { type SyncEventRecurrence } from "@core/types/sync/event.contracts";
import { type ProviderCalendarId } from "@core/types/sync/identity.contracts";
import {
  type CommandRecord,
  type CommandSubmit,
} from "@sync/storage/contracts/command.contracts";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";

export interface CloudCommandRepos {
  commands: CommandRepository;
  events: EventRepository;
  calendars: ProviderCalendarRepository;
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
  repos: CloudCommandRepos,
  submit: CommandSubmit,
  now: () => Date,
): Promise<CommandRecord> {
  const command = await repos.commands.submit(submit);

  // Only a freshly-persisted create is applied here. A command already past
  // pending (a confirmed replay, or a kind we don't apply yet) is returned as
  // it stands, so a repeated submit never re-applies or overwrites an outcome.
  if (command.outcome.state !== "pending") return command;
  if (command.input.kind !== "create") return command;

  // A create whose target calendar is a connected provider calendar must go to
  // the provider, not be confirmed as a local cloud event. Leave it pending for
  // the provider path. A calendar id that resolves to no provider calendar is a
  // Compass cloud calendar, so it is applied locally below.
  const providerCalendar = await repos.calendars.findById(
    command.tenantId,
    command.principalId,
    command.input.calendarId as ProviderCalendarId,
  );
  if (providerCalendar) return command;

  await repos.events.put(buildCloudEventRecord(command, now()));

  const confirmed = await repos.commands.updateOutcome(
    command.tenantId,
    command.principalId,
    command._id,
    { state: "confirmed", providerEventId: null, providerVersion: null },
    command.attemptCount,
  );
  // updateOutcome only misses if the command vanished between submit and now
  // (it cannot, within one request); fall back to the pending record rather
  // than inventing an outcome.
  return confirmed ?? command;
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
