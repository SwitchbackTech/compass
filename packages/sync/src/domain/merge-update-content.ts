import { type SyncEventContent } from "@core/types/sync/event.contracts";

// Browser edits only title + description. An update command still carries a
// full SyncEventContent (strict schema), and the Compass API pads the richer
// fields with null/[] — so applying the wire content verbatim would wipe
// attendees/location/conference Sync already holds from the provider.
// Merge: take editable fields from the command, keep the rest from existing.
export function mergeUpdateContent(
  existing: SyncEventContent,
  incoming: SyncEventContent,
): SyncEventContent {
  return {
    ...existing,
    title: incoming.title,
    description: incoming.description,
  };
}
