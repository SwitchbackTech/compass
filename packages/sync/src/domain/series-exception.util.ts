// Shared series-exception helpers used by BOTH the cloud command path
// (cloud-command.service.ts) and the provider-linked path
// (provider-command.service.ts) for scope "this"/"thisAndFollowing" edits and
// deletes. Pulled out to its own module — rather than one importing from the
// other — because cloud-command.service.ts already imports the provider
// executors (to dispatch a provider-linked command to them), so the reverse
// import would be circular.
import { type DateTime, type EventId } from "@core/types/domain-primitives";
import { reprojectOccurrences } from "@sync/domain/reproject";
import { type CommandRecord } from "@sync/storage/contracts/command.contracts";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { createHash } from "node:crypto";

// The subset of dependencies every helper below needs — narrow so both
// CloudCommandDeps and ProviderMutationDeps (structurally different: one has
// calendars/markers/execution/provider, the other has writer/custody)
// satisfy it without an adapter object.
export interface EventReprojectionDeps {
  events: EventRepository;
  occurrences: EventOccurrenceRepository;
}

// Whether a series exception is a cancelled tombstone (a per-instance
// deletion) rather than a content override.
export function isCancelledException(event: EventRecord): boolean {
  return event.recurrence.kind === "exception" && event.recurrence.cancelled;
}

// The original instant a series exception overrides — its recurrence identity.
export function exceptionInstant(event: EventRecord): DateTime {
  if (event.recurrence.kind !== "exception") {
    throw new Error("exceptionInstant requires an exception event");
  }
  return event.recurrence.recurrenceId;
}

// Reproject a series master excluding every instant one of its exceptions
// owns, so the master never projects an occurrence at an excepted instant.
// Fetches the exceptions fresh, so it picks up the one a scope-"this" edit
// just wrote.
export async function reprojectMaster(
  deps: EventReprojectionDeps,
  command: Pick<CommandRecord, "tenantId" | "principalId">,
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

// Remove the given exception events and clear each one's occurrences.
export async function deleteExceptions(
  deps: EventReprojectionDeps,
  command: Pick<CommandRecord, "tenantId" | "principalId">,
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

// Delete every exception at or after the split instant and clear its
// occurrences — shared by a cloud and a provider-linked thisAndFollowing
// split, which both discard the same local exception rows.
export async function deleteFollowingExceptions(
  deps: EventReprojectionDeps,
  command: Pick<CommandRecord, "tenantId" | "principalId">,
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

// A deterministic event id for the remainder series of a thisAndFollowing
// split, so the same split always resolves to the same master and a retry
// never duplicates it. A 24-hex prefix of a SHA-256 over (seriesId, split) is
// a valid Compass event id and collision-safe. Lowercase hex is a strict
// subset of Google's base32hex event-id charset, so a provider-linked split
// reuses this SAME id as the provider event id too — one deterministic
// identity, not two independently derived ones.
export function remainderMasterId(
  seriesId: EventId,
  splitAt: DateTime,
): EventId {
  return createHash("sha256")
    .update(`${seriesId}:${splitAt}`)
    .digest("hex")
    .slice(0, 24) as EventId;
}
