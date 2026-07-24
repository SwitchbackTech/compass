// The reversible app-facing id for a projected series occurrence (S39, D1=II).
//
// Sync projects series instances rather than materializing them, so a projected
// occurrence has no id of its own — only its owning series (`eventId`) and its
// original scheduled start (`recurrenceId`). The browser needs a stable per-row
// id to key, edit, and delete. B4 (read wiring) composes one from those two
// parts; C (write wiring) decodes a PUT/DELETE /api/event/:id back into the
// command's (eventId, recurrenceId, scope). Keeping the codec here, pure and
// unit-tested, isolates the round-trip from the wiring on both sides.
//
// Format: `${eventId}::${recurrenceId}`. The eventId is a 24-char ObjectId hex
// (no colons) and recurrenceId is an ISO datetime (single colons only, never
// `::`), so the FIRST `::` is an unambiguous separator. A plain event id (a
// single or a series master row) has no `::` and decodes to null — the caller
// treats that as "the whole event", not one occurrence.

const SEPARATOR = "::";
const OBJECT_ID = /^[0-9a-f]{24}$/;
// A loose ISO-8601 datetime check: date + T + time, optional fraction, offset
// (Z or +/-HH:MM). Enough to reject a malformed tail without re-implementing a
// full parser — the value originated from the sync contract's DateTime.
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
