import { type SyncEventContent } from "@core/types/sync/event.contracts";

// Browser edits only title + description (+ optional color). An update command
// still carries a full SyncEventContent (strict schema), and the Compass API
// pads the richer fields with null/[] — so applying the wire content verbatim
// would wipe attendees/location/conference Sync already holds from the
// provider. Merge: take editable fields from the command, keep the rest from
// existing. Color: a slot replaces, null clears (field omitted), omit keeps
// whatever Sync already stores.
export function mergeUpdateContent(
  existing: SyncEventContent,
  incoming: SyncEventContent,
): SyncEventContent {
  const base: SyncEventContent = {
    ...existing,
    title: incoming.title,
    description: incoming.description,
  };

  if (incoming.color === null) {
    const { color: _cleared, ...withoutColor } = base;
    return withoutColor;
  }

  if (incoming.color !== undefined) {
    return { ...base, color: incoming.color };
  }

  return base;
}
