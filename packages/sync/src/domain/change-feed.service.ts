import { ObjectId } from "mongodb";
import {
  type ChangeFeedCursor,
  ChangeFeedCursorSchema,
  type ChangeFeedResponse,
  type InvalidationEnvelope,
} from "@core/types/sync/change-feed.contracts";
import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import {
  INVALIDATION_RETENTION_MS,
  type InvalidationRepository,
} from "@sync/storage/repositories/invalidation.repository";

export const CHANGE_FEED_PAGE_SIZE = 100;

export interface ChangeFeedDeps {
  invalidations: InvalidationRepository;
}

// Resume the authenticated principal's content-free invalidation feed.
//
// - null cursor: "from now" — empty page + a fresh ObjectId watermark.
// - valid cursor within retention: keyset page after that id.
// - malformed or older-than-retention cursor: resyncRequired (caller must
//   invalidate cached queries rather than trust a partial replay).
export async function readChangeFeed(
  deps: ChangeFeedDeps,
  tenantId: TenantId,
  principalId: PrincipalId,
  cursor: string | null,
  now: () => Date = () => new Date(),
): Promise<ChangeFeedResponse> {
  const at = now();

  if (cursor === null) {
    const highWater = await deps.invalidations.latestId(tenantId, principalId);
    return {
      kind: "ok",
      invalidations: [],
      // Prefer the principal's current high-water mark. Mint only when the
      // outbox is empty so the first append after connect is still after the
      // watermark.
      nextCursor: asCursor(highWater ?? new ObjectId().toHexString()),
    };
  }

  if (!ObjectId.isValid(cursor) || cursor.length !== 24) {
    return { kind: "resyncRequired" };
  }

  const cursorTime = ObjectId.createFromHexString(cursor).getTimestamp();
  if (at.getTime() - cursorTime.getTime() > INVALIDATION_RETENTION_MS) {
    return { kind: "resyncRequired" };
  }

  const rows = await deps.invalidations.listAfter(
    tenantId,
    principalId,
    cursor,
    CHANGE_FEED_PAGE_SIZE,
  );

  const envelopes: InvalidationEnvelope[] = rows.map((row) => ({
    invalidation: row.invalidation,
    emittedAt: row.emittedAt.toISOString() as InvalidationEnvelope["emittedAt"],
  }));

  const nextCursor =
    rows.length > 0 ? asCursor(rows[rows.length - 1]._id) : asCursor(cursor);

  return { kind: "ok", invalidations: envelopes, nextCursor };
}

function asCursor(id: string): ChangeFeedCursor {
  return ChangeFeedCursorSchema.parse(id);
}
