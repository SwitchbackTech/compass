import { backfillBootstrapState } from "@scripts/commands/backfill-bootstrap-state/backfill";
import { ObjectId } from "mongodb";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { beforeEach, describe, expect, it } from "bun:test";

const objectId = () => new ObjectId().toHexString();

describe("backfillBootstrapState", () => {
  const storage = setupSyncStorage(import.meta.url);
  let resources: SyncResourceRepository;

  beforeEach(() => {
    resources = new SyncResourceRepository(storage.db());
  });

  const collection = () =>
    storage.db().collection(SYNC_COLLECTIONS.syncResources);

  // ensure() always writes an explicit bootstrapState, so a legacy row (one
  // written before the field existed) is simulated by unsetting it after
  // insert - the only way such a row exists today.
  async function seedLegacyResource(): Promise<SyncResourceRecord> {
    const resource = await resources.ensure({
      tenantId: objectId() as SyncResourceRecord["tenantId"],
      principalId: objectId() as SyncResourceRecord["principalId"],
      connectionId: objectId() as SyncResourceRecord["connectionId"],
      resourceKind: "events",
      calendarId: objectId() as SyncResourceRecord["calendarId"],
    });
    await collection().updateOne(
      { _id: resource._id },
      { $unset: { bootstrapState: "" } },
    );
    return resource;
  }

  it("dry-runs by default: finds legacy rows but writes nothing", async () => {
    const legacy = await seedLegacyResource();

    const report = await backfillBootstrapState(storage.db(), {
      dryRun: true,
    });

    expect(report.matched).toBe(1);
    expect(report.updated).toBe(0);
    expect(report.ids).toEqual([legacy._id]);
    const raw = await collection().findOne({ _id: legacy._id });
    expect(raw?.["bootstrapState"]).toBeUndefined();
  });

  it("stamps bootstrapState: ready onto legacy rows when applied", async () => {
    const legacy = await seedLegacyResource();

    const report = await backfillBootstrapState(storage.db(), {
      dryRun: false,
    });

    expect(report.matched).toBe(1);
    expect(report.updated).toBe(1);
    const raw = await collection().findOne({ _id: legacy._id });
    expect(raw?.["bootstrapState"]).toBe("ready");
  });

  it("leaves a resource that already has an explicit bootstrapState untouched", async () => {
    // A fresh events resource inserts as "importing" - if the backfill's
    // filter were wrong (e.g. matched on state rather than field presence)
    // this would get wrongly bumped to "ready" mid-import.
    const fresh = await resources.ensure({
      tenantId: objectId() as SyncResourceRecord["tenantId"],
      principalId: objectId() as SyncResourceRecord["principalId"],
      connectionId: objectId() as SyncResourceRecord["connectionId"],
      resourceKind: "events",
      calendarId: objectId() as SyncResourceRecord["calendarId"],
    });
    expect(fresh.bootstrapState).toBe("importing");

    const report = await backfillBootstrapState(storage.db(), {
      dryRun: false,
    });

    expect(report.matched).toBe(0);
    const raw = await collection().findOne({ _id: fresh._id });
    expect(raw?.["bootstrapState"]).toBe("importing");
  });

  it("is idempotent: a second run finds nothing left to do", async () => {
    await seedLegacyResource();
    await backfillBootstrapState(storage.db(), { dryRun: false });

    const second = await backfillBootstrapState(storage.db(), {
      dryRun: false,
    });

    expect(second.matched).toBe(0);
    expect(second.updated).toBe(0);
  });
});
