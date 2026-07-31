import { ObjectId } from "mongodb";
import {
  type ChangeFeedCursor,
  ChangeFeedCursorSchema,
  type ChangeFeedResponse,
  type GlobalChangeFeedResponse,
  type GlobalInvalidationEnvelope,
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

  if (isStaleOrMalformed(cursor, at)) {
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

  const last = rows.at(-1);
  const nextCursor = last ? asCursor(last._id) : asCursor(cursor);

  return { kind: "ok", invalidations: envelopes, nextCursor };
}

// Resume the GLOBAL (cross-tenant) content-free invalidation feed — the
// single multiplexed poll the backend runs once per process instead of once
// per connected user (S-multiplex). Same resume semantics as readChangeFeed,
// just unscoped; each envelope carries its own tenantId/principalId so the
// one caller can route to the right user's SSE subscribers.
export async function readGlobalChangeFeed(
  deps: ChangeFeedDeps,
  cursor: string | null,
  now: () => Date = () => new Date(),
): Promise<GlobalChangeFeedResponse> {
  const at = now();

  if (cursor === null) {
    const highWater = await deps.invalidations.latestIdGlobal();
    return {
      kind: "ok",
      invalidations: [],
      nextCursor: asCursor(highWater ?? new ObjectId().toHexString()),
    };
  }

  if (isStaleOrMalformed(cursor, at)) {
    return { kind: "resyncRequired" };
  }

  const rows = await deps.invalidations.listAfterGlobal(
    cursor,
    CHANGE_FEED_PAGE_SIZE,
  );

  const envelopes: GlobalInvalidationEnvelope[] = rows.map((row) => ({
    invalidation: row.invalidation,
    emittedAt: row.emittedAt.toISOString() as InvalidationEnvelope["emittedAt"],
    tenantId: row.tenantId,
    principalId: row.principalId,
  }));

  const last = rows.at(-1);
  const nextCursor = last ? asCursor(last._id) : asCursor(cursor);

  return { kind: "ok", invalidations: envelopes, nextCursor };
}

// A resume cursor is unusable either because it is not a well-formed ObjectId
// (a client bug or tampering) or because it points further back than the
// outbox's retention window — either way the caller must resync rather than
// trust what would be a partial replay. Shared by both feeds above.
function isStaleOrMalformed(cursor: string, at: Date): boolean {
  if (!ObjectId.isValid(cursor) || cursor.length !== 24) return true;
  const cursorTime = ObjectId.createFromHexString(cursor).getTimestamp();
  return at.getTime() - cursorTime.getTime() > INVALIDATION_RETENTION_MS;
}

function asCursor(id: string): ChangeFeedCursor {
  return ChangeFeedCursorSchema.parse(id);
}
