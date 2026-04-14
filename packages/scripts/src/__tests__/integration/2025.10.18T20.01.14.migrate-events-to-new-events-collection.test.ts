import { faker } from "@faker-js/faker";
import { MigratorType } from "@scripts/common/cli.types";
import NewEventsCollectionMigration from "@scripts/migrations/2025.10.18T19.43.00.new-events-collection";
import Migration from "@scripts/migrations/2025.10.18T20.01.14.migrate-events-to-new-events-collection";
import { Logger } from "@core/logger/winston.logger";
import { EventDriver } from "@backend/__tests__/drivers/event.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

describe("2025.10.18T20.01.14.migrate-events-to-new-events-collection", () => {
  const migration = new Migration();
  const collectionName = `${Collections.EVENT}_new`;
  const newCollection = () => mongoService.db.collection(collectionName);

  // num of users/num of calendars/count in mockGcalEvents
  const count = faker.number.int({ min: 2, max: MONGO_BATCH_SIZE });
  const calendarCount = count; // Number of users calendars
  // Each user has(all-day, timed)(1 base, 1 regular, 1 someday,count instances)
  const eventCount = ((count + 2) * 2 + 1) * count;

  async function validateUpMigration() {
    const calendars = await mongoService.calendar.find({}).toArray();
    const oldEvents = await mongoService.event.find({}).toArray();

    expect(calendars).toHaveLength(calendarCount);
    expect(oldEvents).toHaveLength(eventCount);

    await migration.up(migrationContext);

    const migratedEvents = await newCollection().find().toArray();

    expect(migratedEvents).toHaveLength(eventCount);
  }

  const migrationContext = {
    name: Migration.prototype.name,
    context: {
      logger: Logger("test:migration"),
      migratorType: MigratorType.MIGRATION,
      unsafe: false,
    },
  };

  beforeAll(setupTestDb);
  beforeEach(() => EventDriver.generateV0Data(count));
  beforeEach(NewEventsCollectionMigration.prototype.up);
  beforeEach(validateUpMigration);
  afterEach(cleanupCollections);
  afterEach(NewEventsCollectionMigration.prototype.down);
  afterAll(cleanupTestDb);

  describe("up", () => {
    it("migrates valid events from old to the new events collection", () => {
      // validation is done in beforeEach hook
    });
  });

  describe("down", () => {
    it("clears the new collection without touching original events", async () => {
      await migration.down(migrationContext);

      expect(await newCollection().countDocuments()).toBe(0);
      expect(await mongoService.event.countDocuments()).toBe(eventCount);
    });
  });
});
