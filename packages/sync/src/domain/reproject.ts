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

// How many occurrence documents one transaction may carry.
//
// The caller batches by EVENT count (PROJECTION_BATCH_SIZE in
// provider-page-applier.ts), which does not bound the write at all: a single
// recurring event expands to hundreds of occurrences, so a batch of 200 events
// can be tens of thousands of documents. On Atlas that overran the WiredTiger
// cache -- "transaction is too large and will not fit in the storage engine
// cache" (code 388) -- and the failure is deterministic, so the initial import
// for one production calendar failed on all 20 attempts, exhausted its requeue
// budget, and sat wedged for five days with that user's calendar never
// importing (2026-08-23).
//
// Event count was never the right unit. Chunk by what the storage engine
// actually measures. Small enough to stay far from the cache ceiling, large
// enough that ordinary pages (a few occurrences per event) still commit once.
const MAX_OCCURRENCES_PER_TRANSACTION = 2_000;

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

  let chunk: typeof replacements = [];
  let pending = 0;
  for (const replacement of replacements) {
    // Flush what is already queued before adding an entry that would push the
    // chunk over. An entry is never split: replaceForEvents deletes and
    // re-inserts per (eventId, generation), and that pair must stay atomic, so
    // one event whose own expansion exceeds the cap still goes in a single
    // transaction -- it just goes alone.
    if (
      chunk.length > 0 &&
      pending + replacement.occurrences.length > MAX_OCCURRENCES_PER_TRANSACTION
    ) {
      await occurrences.replaceForEvents(chunk);
      chunk = [];
      pending = 0;
    }
    chunk.push(replacement);
    pending += replacement.occurrences.length;
  }
  if (chunk.length > 0) await occurrences.replaceForEvents(chunk);
}
