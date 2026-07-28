import { withColor } from "@core/types/event-color.contracts";
import { type SyncEventContent } from "@core/types/sync/event.contracts";

// Stored event records omit `color` when unset. Null is only a write-command
// signal ("clear the tag"); persisting it breaks SyncEventInstance assembly
// because the read contract rejects null (optional slot only).
export function normalizeStoredContent(
  content: SyncEventContent,
): SyncEventContent {
  const { color, ...rest } = content;
  return { ...rest, ...withColor(color ?? undefined) };
}
