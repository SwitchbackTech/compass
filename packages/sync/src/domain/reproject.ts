import { type DateTime } from "@core/types/domain-primitives";
import { syncHorizon } from "@sync/domain/horizon";
import { projectOccurrences } from "@sync/domain/occurrence-projection";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";

// Rebuild an event's occurrence window after a cloud or provider write, so range
// queries stay current. Idempotent per (eventId, generation) — a retry
// reprojects the same rows. A create or single-event edit carries no exceptions;
// series-scope edits pass their exceptions' recurrenceIds once that path lands.
export async function reprojectOccurrences(
  occurrences: EventOccurrenceRepository,
  event: EventRecord,
  now: () => Date,
  excludedInstants: readonly DateTime[] = [],
): Promise<void> {
  const rows = projectOccurrences(event, syncHorizon(now()), excludedInstants);
  await occurrences.replaceForEvent(event._id, event.generation, rows);
}

export interface ReprojectBatchEntry {
  event: EventRecord;
  excludedInstants?: readonly DateTime[];
}

// Batched form of reprojectOccurrences: every entry's rows are computed the
// same way, but written in one transaction instead of one per event. For a
// provider page touching hundreds/thousands of events (an initial import),
// this is what lets provider-page-applier.ts collapse its per-event
// transaction count.
export async function reprojectOccurrencesBatch(
  occurrences: EventOccurrenceRepository,
  entries: readonly ReprojectBatchEntry[],
  now: () => Date,
): Promise<void> {
  if (entries.length === 0) return;
  const horizon = syncHorizon(now());
  const replacements = entries.map(({ event, excludedInstants = [] }) => ({
    eventId: event._id,
    generation: event.generation,
    occurrences: projectOccurrences(event, horizon, excludedInstants),
  }));
  await occurrences.replaceForEvents(replacements);
}
