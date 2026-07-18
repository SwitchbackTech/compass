import { MigratorType } from "@scripts/common/cli.types";
import Migration from "@scripts/migrations/2026.07.14T10.00.00.priority-data-cleanup";
import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { IS_DEV } from "@backend/common/constants/config.constants";
import mongoService from "@backend/common/services/mongo.service";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

// Mirrors the removed `Collections.PRIORITY` naming convention -- see the
// migration under test for why this is reconstructed rather than imported.
const priorityCollectionName = IS_DEV ? "_dev.priority" : "priority";

describe("2026.07.14T10.00.00.priority-data-cleanup", () => {
  const migration = new Migration();

  const contextFor = (dryRun: boolean) => ({
    name: migration.name,
    context: {
      logger: Logger("test:migration"),
      migratorType: MigratorType.MIGRATION,
      unsafe: false,
      dryRun,
    },
  });

  beforeAll(setupTestDb);
  afterEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("no-ops cleanly against a fresh, empty database", async () => {
    await expect(migration.up(contextFor(false))).resolves.toBeUndefined();
  });

  it("unsets the priority field from event documents that still carry it", async () => {
    const events = mongoService.db.collection(
      mongoService.event.collectionName,
    );
    await events.insertMany([
      { _id: new ObjectId(), title: "Standup", priority: "work" },
      { _id: new ObjectId(), title: "Focus block", priority: "unassigned" },
    ]);

    await migration.up(contextFor(false));

    const remaining = await events
      .find({ priority: { $exists: true } })
      .toArray();
    expect(remaining).toHaveLength(0);

    const survivors = await events.find({}).toArray();
    expect(survivors).toHaveLength(2);
    expect(survivors.map((doc) => doc["title"]).sort()).toEqual([
      "Focus block",
      "Standup",
    ]);
  });

  it("leaves event documents without a priority field untouched", async () => {
    const events = mongoService.db.collection(
      mongoService.event.collectionName,
    );
    const id = new ObjectId();
    await events.insertOne({ _id: id, title: "No priority here" });

    await migration.up(contextFor(false));

    const doc = await events.findOne({ _id: id });
    expect(doc).toMatchObject({ title: "No priority here" });
  });

  it("drops the standalone priority collection when present", async () => {
    await mongoService.db
      .collection(priorityCollectionName)
      .insertOne({ _id: new ObjectId(), name: "Work" });

    await migration.up(contextFor(false));

    const stillExists = await mongoService.db
      .listCollections({ name: priorityCollectionName })
      .hasNext();
    expect(stillExists).toBe(false);
  });

  it("is idempotent: rerunning after a clean run makes no further changes", async () => {
    const events = mongoService.db.collection(
      mongoService.event.collectionName,
    );
    await events.insertOne({
      _id: new ObjectId(),
      title: "Standup",
      priority: "work",
    });

    await migration.up(contextFor(false));
    await expect(migration.up(contextFor(false))).resolves.toBeUndefined();

    const remaining = await events
      .find({ priority: { $exists: true } })
      .toArray();
    expect(remaining).toHaveLength(0);
  });
});
