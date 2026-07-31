// The reversible app-facing id for a projected series occurrence, shared by
// every package that needs to compose or decode one: sync mints the
// canonical recurrenceId a projected occurrence carries, the backend
// translates a browser id into a sync command target, and the web composes
// ids optimistically for instances it materializes client-side before a
// settle refetch confirms the server's own id. All three must agree on one
// format, or a scope-"this" action on an id only one side can decode
// silently escalates to the whole series (see resolveCommandTarget).
//
// Format: `${eventId}::${recurrenceId}`. The eventId is a 24-char ObjectId
// hex (no colons) and recurrenceId is an ISO datetime (single colons only,
// never `::`), so the FIRST `::` is an unambiguous separator. A plain event
// id (a single or a series master row) has no `::` and decodes to null — the
// caller treats that as "the whole event", not one occurrence.

const SEPARATOR = "::";
const OBJECT_ID = /^[0-9a-f]{24}$/;
// A loose ISO-8601 datetime check: date + T + time, optional fraction, offset
// (Z or +/-HH:MM). Enough to reject a malformed tail without re-implementing a
// full parser — the value originates from a Date#toISOString() or an
// RFC3339-offset formatter, never free text.
const ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

export interface OccurrenceIdParts {
  eventId: string;
  recurrenceId: string;
}

// Compose the app-facing id for one projected occurrence.
export function composeOccurrenceId(parts: OccurrenceIdParts): string {
  return `${parts.eventId}${SEPARATOR}${parts.recurrenceId}`;
}

// Decode an app-facing id back into (eventId, recurrenceId), or null when the id
// is not a composite occurrence id (a plain event id, or a malformed value). A
// caller uses null to mean "target the whole event", never to guess.
export function decodeOccurrenceId(id: string): OccurrenceIdParts | null {
  const separatorIndex = id.indexOf(SEPARATOR);
  if (separatorIndex === -1) return null;

  const eventId = id.slice(0, separatorIndex);
  const recurrenceId = id.slice(separatorIndex + SEPARATOR.length);
  if (!OBJECT_ID.test(eventId) || !ISO_DATETIME.test(recurrenceId)) {
    return null;
  }

  return { eventId, recurrenceId };
}

// Whether an id LOOKS like it was meant to be a composite occurrence id (it
// contains the separator) — regardless of whether it actually decodes. Used
// to distinguish "a plain event id, no occurrence intended" (legitimately no
// separator) from "a malformed composite" (has one but fails to parse), which
// must be rejected rather than silently treated as the whole event.
export function looksLikeOccurrenceId(id: string): boolean {
  return id.includes(SEPARATOR);
}

// Mint the recurrenceId a NEW occurrence would carry, matching exactly what
// the sync service's own projection assigns (packages/sync's
// `scheduleStartAt` + `occurrence.startAt.toISOString()`): a timed instant is
// its UTC instant with milliseconds; an all-day instant is UTC midnight of its
// date. Used only for optimistic client-side ids ahead of a settle refetch —
// the server is always the eventual source of truth for the real id — but it
// must still be BYTE-IDENTICAL to what the server will mint, or an action on
// a not-yet-confirmed instance fails to decode server-side.
export function composeOccurrenceIdFromSchedule(
  eventId: string,
  schedule: { kind: "timed" | "allDay"; start: string },
): string {
  const recurrenceId =
    schedule.kind === "allDay"
      ? `${schedule.start}T00:00:00.000Z`
      : new Date(schedule.start).toISOString();
  return composeOccurrenceId({ eventId, recurrenceId });
}
