import { ObjectId } from "bson";
import { faker } from "@faker-js/faker";
import { MigratorType } from "@scripts/common/cli.types";
import CalendarMigration from "@scripts/migrations/2025.10.03T01.19.59.calendar-schema";
import CalendarUpdateMigration from "@scripts/migrations/2025.10.14T12.24.01.update-calendar-schema";
import Migration from "@scripts/migrations/2025.10.16T12.26.00.migrate-calendarlist-to-calendar";
import { Logger } from "@core/logger/winston.logger";
import { CalendarProvider } from "@core/types/calendar.types";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import { IS_DEV } from "@backend/common/constants/env.constants";
import mongoService from "@backend/common/services/mongo.service";

describe("2025.10.16T12.26.00.migrate-calendarlist-to-calendar", () => {
  const migration = new Migration();
  const oldCollectionName = IS_DEV ? "_dev.calendarlist" : "calendarlist";

  const count = faker.number.int({
    min: MONGO_BATCH_SIZE * 2,
    max: MONGO_BATCH_SIZE * 3,
  });

  const migrationContext = {
    name: migration.name,
    context: {
      logger: Logger("test:migration"),
      migratorType: MigratorType.MIGRATION,
      unsafe: false,
    },
  };

  beforeAll(setupTestDb);
  beforeEach(() => CalendarDriver.generateV0Data(count));
  beforeEach(CalendarMigration.prototype.up);
  beforeEach(CalendarUpdateMigration.prototype.up);
  afterEach(cleanupCollections);
  afterEach(() => mongoService.db.collection(oldCollectionName).deleteMany());
  afterEach(() => mongoService.calendar.drop());
  afterAll(cleanupTestDb);

  async function validateUpMigration() {
    const calendarList = await mongoService.db
      .collection(oldCollectionName)
      .find()
      .toArray();

    // Verify only exact sync data count exists initially
    expect(calendarList).toHaveLength(count);

    // Run migration
    await migration.up(migrationContext);

    // Verify migration results
    // Verify calendar data was created
    const calendars = await mongoService.calendar.find().toArray();

    const calendarCount = calendarList.reduce(
      (acc, { google: { items } }) => acc + items.length,
      0,
    );

    expect(calendars).toHaveLength(calendarCount);

    // Verify each watch document has correct data
    expect(calendars).toEqual(
      expect.arrayContaining(
        calendarList.flatMap(({ user, google }) =>
          google.items.map((item: Record<string, string>) => {
            return expect.objectContaining({
              _id: expect.any(ObjectId),
              user: mongoService.objectId(user),
              backgroundColor: item["backgroundColor"],
              color: item["foregroundColor"],
              selected: true,
              primary: item["primary"],
              timezone: item["timeZone"],
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
              metadata: expect.objectContaining({
                id: item["id"],
                provider: CalendarProvider.GOOGLE,
                etag: item["etag"],
                summary: item["summary"],
                accessRole: item["accessRole"],
                conferenceProperties: item["conferenceProperties"],
                defaultReminders: item["defaultReminders"],
              }),
            });
          }),
        ),
      ),
    );

    // Verify original sync data is unchanged
    const calendarListAfter = await mongoService.db
      .collection(oldCollectionName)
      .find()
      .toArray();

    expect(calendarListAfter).toHaveLength(count);
  }

  describe("up migration", () => {
    it(
      "migrates calendarlist entries to calendar collection",
      validateUpMigration,
    );

    it("should handle no calendarlist documents", async () => {
      // Run migration with empty calendarlist collection
      await mongoService.db.collection(oldCollectionName).deleteMany();
      await expect(migration.up(migrationContext)).resolves.not.toThrow();

      const totalCalendars = await mongoService.calendar.countDocuments();

      expect(totalCalendars).toBe(0);
    });
  });

  describe("down migration", () => {
    it("should not modify calendarList data (non-destructive)", async () => {
      const calendarList = await mongoService.db
        .collection(oldCollectionName)
        .find()
        .toArray();

      await validateUpMigration();

      // Run down migration
      await migration.down(migrationContext);

      // Verify calendarList data is unchanged
      const calendarListAfter = await mongoService.db
        .collection(oldCollectionName)
        .find()
        .toArray();

      expect(calendarListAfter).toEqual(expect.arrayContaining(calendarList));

      const calendars = await mongoService.calendar.find().toArray();

      expect(calendars).toHaveLength(0);
    });
  });
});
