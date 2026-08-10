import { type SyncEventContent } from "@core/types/sync/event.contracts";

// Browser edits only title + description + location (+ optional color). An
// update command still carries a full SyncEventContent (strict schema), and
// the Compass API pads richer fields with null/[] — applying that verbatim
// would wipe attendees/conference Sync already holds from the provider.
//
// Merge editable fields from the command; keep the rest from existing.
// Color: slot replaces, null clears (omit the field), omit keeps existing.
// colorHex is provider-read-only; a slot write (or clear of a prior slot)
// must drop it so palette resolution cannot resurrect the old fill after
// settle. Drafts often send color:null for "no slot" on hex-only events —
// that must not wipe colorHex.
export function mergeUpdateContent(
  existing: SyncEventContent,
  incoming: SyncEventContent,
): SyncEventContent {
  const {
    color: existingColor,
    colorHex: existingColorHex,
    ...existingRest
  } = existing;
  const merged: SyncEventContent = {
    ...existingRest,
    title: incoming.title,
    description: incoming.description,
    location: incoming.location,
  };

  if (incoming.color === null) {
    if (existingColor !== undefined) return merged;
    return existingColorHex !== undefined
      ? { ...merged, colorHex: existingColorHex }
      : merged;
  }
  if (incoming.color !== undefined) {
    return { ...merged, color: incoming.color };
  }

  let kept = merged;
  if (existingColor !== undefined) kept = { ...kept, color: existingColor };
  if (existingColorHex !== undefined) {
    kept = { ...kept, colorHex: existingColorHex };
  }
  return kept;
}

// Null is a write-command "clear" signal. Stored/read rows omit the field;
// persisting null fails SyncEventInstance validation on list.
export function omitNullColor(content: SyncEventContent): SyncEventContent {
  if (content.color !== null) return content;
  const { color: _color, ...rest } = content;
  return rest;
}
