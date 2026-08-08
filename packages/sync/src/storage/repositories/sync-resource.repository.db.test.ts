import { faker } from "@faker-js/faker";
import { type Db } from "mongodb";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { type SyncResourceUpsert } from "@sync/storage/contracts/sync-resource.contracts";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const objectId = () => faker.database.mongodbObjectId();

const upsert = (
  overrides: Partial<SyncResourceUpsert> = {},
): SyncResourceUpsert =>
  ({
    tenantId: objectId(),
    principalId: objectId(),
    connectionId: objectId(),
    resourceKind: "events",
    calendarId: objectId(),
    ...overrides,
  }) as SyncResourceUpsert;

describe("SyncResourceRepository", () => {
  const storage = setupSyncStorage(import.meta.url);
  let db: Db;
  let repo: SyncResourceRepository;

  beforeEach(() => {
    db = storage.db();
    repo = new SyncResourceRepository(db);
  });

  it("creates a resource with empty cursors and generation 0", async () => {
    const resource = await repo.ensure(upsert());
    expect(resource.syncCursor).toBeNull();
    expect(resource.pageCursor).toBeNull();
    expect(resource.importGeneration).toBe(0);
    expect(resource.activeGeneration).toBe(0);
  });

  it("activates a generation without moving the import generation", async () => {
    const tenantId = objectId() as never;
    const principalId = objectId() as never;
    const resource = await repo.ensure(
      upsert({ tenantId, principalId }) as SyncResourceUpsert,
    );
    // A repair builds a new import generation, leaving reads on the old one.
    const importGen = await repo.startNewGeneration(
      tenantId,
      principalId,
      resource._id,
    );
    expect(importGen).toBe(1);
    let after = await repo.findById(tenantId, principalId, resource._id);
    expect(after?.activeGeneration).toBe(0);

    // Activation flips reads to the new generation.
    await repo.activateGeneration(
      tenantId,
      principalId,
      resource._id,
      importGen,
    );
    after = await repo.findById(tenantId, principalId, resource._id);
    expect(after?.activeGeneration).toBe(1);
    expect(after?.importGeneration).toBe(1);
  });

  it("resolves the active generation for each event calendar, defaulting absent ones", async () => {
    const tenantId = objectId() as never;
    const principalId = objectId() as never;
    const calA = objectId() as never;
    const calB = objectId() as never;
    const absent = objectId() as never;
    const a = await repo.ensure(
      upsert({ tenantId, principalId, calendarId: calA }) as SyncResourceUpsert,
    );
    await repo.ensure(
      upsert({ tenantId, principalId, calendarId: calB }) as SyncResourceUpsert,
    );
    // calA has been repaired and activated to generation 1; calB stays at 0.
    await repo.startNewGeneration(tenantId, principalId, a._id);
    await repo.activateGeneration(tenantId, principalId, a._id, 1);

    const map = await repo.activeGenerationByCalendar(tenantId, principalId, [
      calA,
      calB,
      absent,
    ]);
    expect(map.get(calA)).toBe(1);
    expect(map.get(calB)).toBe(0);
    // A calendar with no events resource is absent — the caller reads gen 0.
    expect(map.has(absent)).toBe(false);
  });

  it("ensures one resource per (connection, kind, calendar)", async () => {
    const key = {
      connectionId: objectId(),
      resourceKind: "events" as const,
      calendarId: objectId(),
    };
    const first = await repo.ensure(upsert(key));
    const second = await repo.ensure(upsert(key));
    expect(second._id).toBe(first._id);
    expect(await db.collection("sync_resources").countDocuments()).toBe(1);
  });

  it("ensures one calendar-list resource per connection", async () => {
    const key = {
      connectionId: objectId(),
      resourceKind: "calendarList" as const,
      calendarId: null,
    };
    const first = await repo.ensure(upsert(key));
    const second = await repo.ensure(upsert(key));
    expect(second._id).toBe(first._id);
    expect(await db.collection("sync_resources").countDocuments()).toBe(1);
  });

  it("re-ensuring an in-progress resource does not wipe its cursors or subscription", async () => {
    const resource = await repo.ensure(upsert());
    await repo.advanceCursor(
      resource.tenantId,
      resource.principalId,
      resource._id,
      "sync-token-1",
      new Date("2026-07-20T12:00:00.000Z"),
    );
    await repo.updateSubscription(
      resource.tenantId,
      resource.principalId,
      resource._id,
      {
        subscriptionId: "chan-1",
        subscriptionResourceId: "res-1",
        subscriptionToken: "chan-token-1",
        subscriptionExpiresAt: new Date("2026-07-27T00:00:00.000Z"),
      },
    );

    // A later ensure() for the same key must return the advanced state intact.
    const again = await repo.ensure(
      upsert({
        connectionId: resource.connectionId,
        resourceKind: resource.resourceKind,
        calendarId: resource.calendarId,
      }),
    );
    expect(again._id).toBe(resource._id);
    expect(again.syncCursor).toBe("sync-token-1");
    expect(again.subscriptionId).toBe("chan-1");
  });

  it("keeps the calendar-list resource distinct from event resources", async () => {
    const connectionId = objectId();
    await repo.ensure(
      upsert({ connectionId, resourceKind: "calendarList", calendarId: null }),
    );
    await repo.ensure(
      upsert({ connectionId, resourceKind: "events", calendarId: objectId() }),
    );
    expect(await db.collection("sync_resources").countDocuments()).toBe(2);
  });

  it("advancing the cursor clears the mid-batch page checkpoint", async () => {
    const resource = await repo.ensure(upsert());
    await repo.setPageCheckpoint(
      resource.tenantId,
      resource.principalId,
      resource._id,
      "page-token-2",
    );
    const mid = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(mid?.pageCursor).toBe("page-token-2");

    const succeededAt = new Date("2026-07-20T12:00:00.000Z");
    await repo.advanceCursor(
      resource.tenantId,
      resource.principalId,
      resource._id,
      "sync-token-final",
      succeededAt,
    );
    const done = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(done?.syncCursor).toBe("sync-token-final");
    expect(done?.pageCursor).toBeNull();
    expect(done?.lastSuccessAt).toEqual(succeededAt);
  });

  it("keeps the first read failure's timestamp while refreshing its detail", async () => {
    const resource = await repo.ensure(upsert());
    const first = new Date("2026-07-20T12:00:00.000Z");
    const later = new Date("2026-07-23T12:00:00.000Z");
    await repo.markReadFailure(
      resource.tenantId,
      resource.principalId,
      resource._id,
      first,
      "Not Found (HTTP 404, reason notFound)",
    );
    await repo.markReadFailure(
      resource.tenantId,
      resource.principalId,
      resource._id,
      later,
      "Forbidden (HTTP 403, reason forbidden)",
    );

    const after = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    // The FIRST timestamp is what says how long the calendar has been dead.
    expect(after?.lastReadFailureAt).toEqual(first);
    expect(after?.lastReadFailureDetail).toContain("HTTP 403");
  });

  it("clears the read-failure marker when the cursor next advances", async () => {
    const resource = await repo.ensure(upsert());
    await repo.markReadFailure(
      resource.tenantId,
      resource.principalId,
      resource._id,
      new Date("2026-07-20T12:00:00.000Z"),
      "Not Found (HTTP 404, reason notFound)",
    );
    await repo.advanceCursor(
      resource.tenantId,
      resource.principalId,
      resource._id,
      "sync-token",
      new Date("2026-07-24T12:00:00.000Z"),
    );

    const after = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(after?.lastReadFailureAt).toBeNull();
    expect(after?.lastReadFailureDetail).toBeNull();
  });

  it("clears the read-failure marker on success even when syncCursor is null", async () => {
    const resource = await repo.ensure(upsert());
    await repo.advanceCursor(
      resource.tenantId,
      resource.principalId,
      resource._id,
      "kept-cursor",
      new Date("2026-07-20T12:00:00.000Z"),
    );
    await repo.markReadFailure(
      resource.tenantId,
      resource.principalId,
      resource._id,
      new Date("2026-07-21T12:00:00.000Z"),
      "The user must be signed up for Google Calendar. (HTTP 403, reason notACalendarUser)",
    );
    const succeededAt = new Date("2026-07-24T12:00:00.000Z");
    await repo.advanceCursor(
      resource.tenantId,
      resource.principalId,
      resource._id,
      null,
      succeededAt,
    );

    const after = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(after?.syncCursor).toBe("kept-cursor");
    expect(after?.lastSuccessAt).toEqual(succeededAt);
    expect(after?.lastReadFailureAt).toBeNull();
    expect(after?.lastReadFailureDetail).toBeNull();
  });

  it("updates and clears the push subscription", async () => {
    const resource = await repo.ensure(upsert());
    await repo.updateSubscription(
      resource.tenantId,
      resource.principalId,
      resource._id,
      {
        subscriptionId: "chan-1",
        subscriptionResourceId: "res-1",
        subscriptionToken: "chan-token-1",
        subscriptionExpiresAt: new Date("2026-07-27T00:00:00.000Z"),
      },
    );
    let read = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(read?.subscriptionId).toBe("chan-1");

    await repo.clearSubscription(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    read = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(read?.subscriptionId).toBeNull();
    expect(read?.subscriptionExpiresAt).toBeNull();
  });

  it("starts a new import generation for a repair", async () => {
    const resource = await repo.ensure(upsert());
    const scope = [
      resource.tenantId,
      resource.principalId,
      resource._id,
    ] as const;
    expect(await repo.startNewGeneration(...scope)).toBe(1);
    expect(await repo.startNewGeneration(...scope)).toBe(2);
  });

  it("does not let another principal advance the cursor (tenant isolation)", async () => {
    const resource = await repo.ensure(upsert());
    await repo.advanceCursor(
      resource.tenantId,
      objectId() as SyncResourceUpsert["principalId"],
      resource._id,
      "leaked-token",
      new Date(),
    );
    const read = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    // The write against the wrong principal matched nothing.
    expect(read?.syncCursor).toBeNull();
  });

  it("scopes findById to the owning principal", async () => {
    const resource = await repo.ensure(upsert());
    expect(
      await repo.findById(
        resource.tenantId,
        objectId() as SyncResourceUpsert["principalId"],
        resource._id,
      ),
    ).toBeNull();
  });
});
