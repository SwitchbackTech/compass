import { MigratorType } from "@scripts/common/cli.types";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import Migration from "@scripts/migrations/2026.07.13T11.59.00.event-priority-schema-repair";
import { type Document, ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  type EventRecord,
  EventRecordSchema,
} from "@backend/event/event.record";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

describe("2026.07.13T11.59.00.event-priority-schema-repair", () => {
  const migration = new Migration();
  const collectionName = () => mongoService.event.collectionName;
  const events = () =>
    mongoService.db.collection<EventRecord & { priority?: string }>(
      collectionName(),
    );
  const migrationContext = {
    name: migration.name,
    context: {
      logger: Logger("test:migration"),
      migratorType: MigratorType.MIGRATION,
      unsafe: false,
      dryRun: false,
    },
  };

  const eventRecord = (): EventRecord => ({
    _id: new ObjectId(),
    calendarId: new ObjectId(),
    content: { kind: "details", title: "Standup", description: "" },
    schedule: {
      kind: "timed",
      start: new Date("2026-07-14T16:00:00.000Z"),
      end: new Date("2026-07-14T16:30:00.000Z"),
      timeZone: "Etc/UTC",
    },
    recurrence: { kind: "single" },
    externalReference: null,
    createdAt: new Date("2026-07-14T15:00:00.000Z"),
    updatedAt: null,
  });

  const createCollectionWithStaleValidator = async () => {
    const currentSchema = zodToMongoSchema(EventRecordSchema);
    const staleSchema = {
      ...currentSchema,
      properties: {
        ...currentSchema.properties,
        priority: { bsonType: "string" },
      },
      required: [...(currentSchema.required ?? []), "priority"],
    };

    await mongoService.db.createCollection(collectionName(), {
      validator: { $jsonSchema: staleSchema },
      validationLevel: "strict",
    });
  };

  beforeAll(() => setupTestDb(import.meta.url));
  afterEach(async () => {
    await events()
      .drop()
      .catch(() => undefined);
    await mongoService.db
      .collection(`${collectionName()}_legacy_v1`)
      .drop()
      .catch(() => undefined);
    await cleanupCollections();
  });
  afterAll(cleanupTestDb);

  it("no-ops when the active event collection does not exist", async () => {
    await expect(migration.up(migrationContext)).resolves.toBeUndefined();
  });

  it("refuses to modify a pre-cutover legacy event collection", async () => {
    await mongoService.db.createCollection(collectionName());
    await mongoService.db.collection(collectionName()).insertOne({
      _id: new ObjectId(),
      user: new ObjectId().toHexString(),
      title: "Legacy event",
      priority: "work",
    });

    await expect(migration.up(migrationContext)).rejects.toThrow(
      /run it after the event collection rename/,
    );

    expect(
      await mongoService.db
        .collection(collectionName())
        .countDocuments({ priority: "work" }),
    ).toBe(1);
  });

  it("repairs the validator and removes stale priority data", async () => {
    await createCollectionWithStaleValidator();
    const staleEvent = { ...eventRecord(), priority: "work" };
    await events().insertOne(staleEvent);

    await expect(events().insertOne(eventRecord())).rejects.toThrow(
      /Document failed validation/,
    );

    await migration.up(migrationContext);

    expect(await events().countDocuments({ priority: { $exists: true } })).toBe(
      0,
    );
    await expect(events().insertOne(eventRecord())).resolves.toBeDefined();

    const info = await mongoService.db
      .listCollections({ name: collectionName() })
      .next();
    const schema = (info?.options?.validator as Document)?.["$jsonSchema"] as
      | Document
      | undefined;
    expect(schema?.["required"]).not.toContain("priority");
    expect(schema?.["properties"]).not.toHaveProperty("priority");
  });

  it("is idempotent", async () => {
    await createCollectionWithStaleValidator();
    await events().insertOne({ ...eventRecord(), priority: "unassigned" });

    await migration.up(migrationContext);
    await expect(migration.up(migrationContext)).resolves.toBeUndefined();

    expect(await events().countDocuments()).toBe(1);
    expect(await events().countDocuments({ priority: { $exists: true } })).toBe(
      0,
    );
  });

  it("removes leaked Someday data only when the legacy archive preserves it", async () => {
    await createCollectionWithStaleValidator();
    const leakedSomeday = {
      ...eventRecord(),
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-14",
        sortOrder: 0,
      },
      priority: "work",
    };
    await events().insertOne(leakedSomeday as never, {
      bypassDocumentValidation: true,
    });
    await mongoService.db
      .collection(`${collectionName()}_legacy_v1`)
      .insertOne({ _id: leakedSomeday._id });

    await migration.up(migrationContext);

    expect(await events().findOne({ _id: leakedSomeday._id })).toBeNull();
  });

  it("keeps an unarchived Someday leak and fails closed", async () => {
    await createCollectionWithStaleValidator();
    const leakedSomeday = {
      ...eventRecord(),
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-14",
        sortOrder: 0,
      },
      priority: "work",
    };
    await events().insertOne(leakedSomeday as never, {
      bypassDocumentValidation: true,
    });

    await expect(migration.up(migrationContext)).rejects.toThrow(
      /only 0 are preserved in the legacy archive/,
    );
    expect(await events().findOne({ _id: leakedSomeday._id })).not.toBeNull();
  });
});
