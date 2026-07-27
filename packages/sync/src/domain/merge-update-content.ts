import { type SyncEventContent } from "@core/types/sync/event.contracts";

// Browser edits only title + description (+ optional color). An update command
// still carries a full SyncEventContent (strict schema), and the Compass API
// pads richer fields with null/[] — applying that verbatim would wipe
// attendees/location/conference Sync already holds from the provider.
//
// Merge editable fields from the command; keep the rest from existing.
// Color: slot replaces, null clears (omit the field), omit keeps existing.
export function mergeUpdateContent(
  existing: SyncEventContent,
  incoming: SyncEventContent,
): SyncEventContent {
  const { color: existingColor, ...existingWithoutColor } = existing;
  const merged: SyncEventContent = {
    ...existingWithoutColor,
    title: incoming.title,
    description: incoming.description,
  };

  if (incoming.color === null) return merged;
  if (incoming.color !== undefined) return { ...merged, color: incoming.color };
  return existingColor !== undefined
    ? { ...merged, color: existingColor }
    : merged;
}
