import { withColor } from "@core/types/event-color.contracts";
import {
  type SyncEventInstance,
  SyncEventInstanceSchema,
} from "@core/types/sync/event.contracts";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type EventOccurrenceRecord } from "@sync/storage/contracts/event-occurrence.contracts";

// Assemble the full-fidelity event rows the browser read returns, from a page of
// materialized occurrence rows joined to their owning event records. Pure: all
// I/O (occurrence range read, batch event hydration) happens in the caller, so
// every recurring-event subtlety is unit-testable without a database.
//
// `eventsById` must contain every event referenced by an occurrence's `eventId`
// AND, for any exception among those, the master named by its `seriesId` — the
// caller does both fetch hops. Rows whose owning event is missing are skipped
// defensively rather than throwing (an occurrence transiently orphaned from its
// event should not fail the whole page).
//
// Row model (mirrors what the legacy store materializes, so the browser contract
// is unchanged):
//   - single event            -> one `single` row
//   - plain series instance    -> one `occurrence` row (recurrenceId = its start)
//   - overridden instance      -> one `occurrence` row (recurrenceId = the
//                                 exception's ORIGINAL start, not its moved start)
//   - each referenced series    -> one `series` master row, appended out-of-band
//                                 (the app keeps it for edit-all-future but
//                                 suppresses it from rendering)
// Cancelled instances are omitted entirely: a deleted occurrence simply must not
// appear, exactly as it wouldn't in the legacy store.
export function assembleEventInstances(
  occurrences: readonly EventOccurrenceRecord[],
  eventsById: ReadonlyMap<string, EventRecord>,
): SyncEventInstance[] {
  const instances: SyncEventInstance[] = [];
  // Series masters referenced by any instance row, back-filled once at the end.
  const seriesMasterIds = new Set<string>();

  for (const occurrence of occurrences) {
    // A cancelled exception still emits an occurrence row so reprojection is
    // deterministic; for display it means "this instance was deleted" — drop it.
    if (occurrence.cancelled) continue;

    const event = eventsById.get(occurrence.eventId);
    if (!event) continue;

    const content = toInstanceContent(event.content);
    const timestamps = {
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };

    if (event.recurrence.kind === "single") {
      instances.push(
        SyncEventInstanceSchema.parse({
          eventId: event._id,
          calendarId: occurrence.calendarId,
          content,
          schedule: occurrence.schedule,
          recurrence: { kind: "single" },
          ...timestamps,
        }),
      );
      continue;
    }

    if (event.recurrence.kind === "seriesMaster") {
      // A plain projected instance: its owning event IS the master.
      instances.push(
        SyncEventInstanceSchema.parse({
          eventId: event._id,
          calendarId: occurrence.calendarId,
          content,
          schedule: occurrence.schedule,
          recurrence: {
            kind: "occurrence",
            recurrenceId: occurrence.startAt.toISOString(),
          },
          ...timestamps,
        }),
      );
      seriesMasterIds.add(event._id);
      continue;
    }

    // An exception (overridden instance): its owning event is a separate doc, so
    // the app-facing row must link to the MASTER (its seriesId) and address the
    // slot by the exception's ORIGINAL scheduled start — never the moved
    // occurrence.startAt, which would target the wrong slot on a subsequent edit.
    const { seriesId, recurrenceId } = event.recurrence;
    instances.push(
      SyncEventInstanceSchema.parse({
        eventId: seriesId,
        calendarId: occurrence.calendarId,
        content,
        schedule: occurrence.schedule,
        recurrence: { kind: "occurrence", recurrenceId },
        ...timestamps,
      }),
    );
    seriesMasterIds.add(seriesId);
  }

  // Back-fill one master row per referenced series, appended after the instance
  // page (never interleaved into the keyset-ordered occurrence stream — a
  // master's own schedule may fall entirely outside the queried range).
  for (const masterId of seriesMasterIds) {
    const master = eventsById.get(masterId);
    if (!master || master.recurrence.kind !== "seriesMaster") continue;
    instances.push(
      SyncEventInstanceSchema.parse({
        eventId: master._id,
        calendarId: master.calendarId,
        content: toInstanceContent(master.content),
        schedule: master.schedule,
        recurrence: { kind: "series", rules: master.recurrence.rules },
        createdAt: master.createdAt.toISOString(),
        updatedAt: master.updatedAt.toISOString(),
      }),
    );
  }

  return instances;
}

const toInstanceContent = (content: EventRecord["content"]) => ({
  title: content.title,
  description: content.description,
  // Null can appear on older create rows that stored a write-command clear
  // signal; treat it as "no color" so one bad row cannot 500 the whole page.
  ...withColor(content.color ?? undefined),
});
