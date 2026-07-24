import { faker } from "@faker-js/faker";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  INVALIDATION_RETENTION_MS,
  InvalidationRepository,
} from "@sync/storage/repositories/invalidation.repository";
import { beforeEach, describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

describe("InvalidationRepository", () => {
  const storage = setupSyncStorage(import.meta.url);
  let repo: InvalidationRepository;

  beforeEach(() => {
    repo = new InvalidationRepository(storage.db());
  });

  it("appends a content-free invalidation with TTL expiry", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const connectionId = objectId() as ConnectionId;
    const emittedAt = new Date("2026-07-24T12:00:00.000Z");

    const row = await repo.append({
      tenantId,
      principalId,
      invalidation: { kind: "connection", connectionId },
      emittedAt,
    });

    expect(row.invalidation).toEqual({
      kind: "connection",
      connectionId,
    });
    expect(row.emittedAt).toEqual(emittedAt);
    expect(row.expiresAt.getTime()).toBe(
      emittedAt.getTime() + INVALIDATION_RETENTION_MS,
    );
    // Never store event content on the outbox row.
    expect(Object.keys(row.invalidation).sort()).toEqual([
      "connectionId",
      "kind",
    ]);
  });

  it("keyset-lists only the caller's rows after a cursor", async () => {
    const tenantId = objectId();
    const mine = objectId();
    const other = objectId();
    const connectionId = objectId() as ConnectionId;

    const first = await repo.append({
      tenantId,
      principalId: mine,
      invalidation: { kind: "connection", connectionId },
      emittedAt: new Date(),
    });
    const second = await repo.append({
      tenantId,
      principalId: mine,
      invalidation: {
        kind: "event",
        eventId: objectId() as never,
        calendarId: objectId() as never,
      },
      emittedAt: new Date(),
    });
    await repo.append({
      tenantId,
      principalId: other,
      invalidation: { kind: "connection", connectionId },
      emittedAt: new Date(),
    });

    const page = await repo.listAfter(tenantId, mine, first._id, 10);
    expect(page.map((r) => r._id)).toEqual([second._id]);
  });

  it("has a TTL index that expires rows by expiresAt", async () => {
    const indexes = await storage
      .db()
      .collection(SYNC_COLLECTIONS.invalidations)
      .indexes();
    const ttl = indexes.find((i) => i.name === "ttl_expiry");
    expect(ttl?.key).toEqual({ expiresAt: 1 });
    expect(ttl?.expireAfterSeconds).toBe(0);
  });
});
