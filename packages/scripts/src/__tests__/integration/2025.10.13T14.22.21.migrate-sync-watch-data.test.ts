import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { MigratorType } from "@scripts/common/cli.types";
import WatchMigration from "@scripts/migrations/2025.10.13T14.18.20.watch-collection";
import Migration from "@scripts/migrations/2025.10.13T14.22.21.migrate-sync-watch-data";
import { Logger } from "@core/logger/winston.logger";
import { Resource_Sync } from "@core/types/sync.types";
import dayjs from "@core/util/date/dayjs";
import { SyncDriver } from "@backend/__tests__/drivers/sync.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";

describe.each([
  { generateExpiredWatches: true },
  { generateExpiredWatches: false },
])(
  "2025.10.13T14.22.21.migrate-sync-watch-data - generateExpiredWatches: $generateExpiredWatches",
  ({ generateExpiredWatches }) => {
    const migration = new Migration();
    const count = faker.number.int({ min: 100, max: 150 });

    const migrationContext = {
      name: migration.name,
      context: {
        logger: Logger(""),
        migratorType: MigratorType.MIGRATION,
        unsafe: false,
      },
    };

    beforeAll(setupTestDb);
    beforeAll(() => SyncDriver.generateV0Data(count, generateExpiredWatches));
    beforeEach(WatchMigration.prototype.up);
    afterEach(cleanupCollections);
    afterEach(() => mongoService.watch.drop());
    afterAll(cleanupTestDb);

    it("migrates events watch data from sync to watch collection", async () => {
      const syncDocs = await mongoService.sync.find().toArray();

      // Verify only exact sync data count exists initially
      expect(syncDocs).toHaveLength(count);

      // Run migration
      await migration.up(migrationContext);

      // Verify watch data was created
      const watchDocs = await mongoService.watch.find().toArray();

      const watchCount = syncDocs.reduce(
        (acc, { google: { events, calendarlist } }) => {
          const futureExpiry = (
            events as unknown as Array<{ expiration: string }>
          ).filter(({ expiration }) =>
            dayjs(parseInt(expiration, 10)).isAfter(dayjs()),
          );

          return acc + futureExpiry.length + calendarlist.length;
        },
        0,
      );

      expect(watchDocs).toHaveLength(watchCount);

      // Verify each watch document has correct data
      expect(watchDocs).toEqual(
        expect.arrayContaining(
          syncDocs.flatMap(({ user, google }, index) =>
            google.events.map(() => {
              const watch = watchDocs[index];

              expect(dayjs(watch?.expiration).isAfter(dayjs())).toBe(true);

              return expect.objectContaining({
                _id: expect.any(ObjectId),
                user,
                resourceId: expect.any(String),
                expiration: expect.any(Date),
                createdAt: expect.any(Date),
              });
            }),
          ),
        ),
      );

      // Verify original sync data is unchanged
      const syncDocsAfter = await mongoService.sync.find().toArray();

      expect(syncDocsAfter).toHaveLength(count);
    });

    it("creates an extra calendar list watch upon migration", async () => {
      const syncDocs = await mongoService.sync.find().toArray();

      // Verify only exact sync data count exists initially
      expect(syncDocs).toHaveLength(count);

      // Run migration
      await migration.up(migrationContext);

      // Verify watch data was created
      const watchDocs = await mongoService.watch.find().toArray();

      // Verify each watch document has correct data
      // calendarlist will be absent since we do not currently store resourceId
      expect(watchDocs).toEqual(
        expect.arrayContaining(
          syncDocs.flatMap(({ user, google }) => [
            expect.objectContaining({
              _id: expect.any(ObjectId),
              user,
              resourceId: Resource_Sync.CALENDAR,
              expiration: expect.any(Date),
              createdAt: expect.any(Date),
            }),
            ...google.events.map(() =>
              expect.objectContaining({
                _id: expect.any(ObjectId),
                user,
                resourceId: expect.any(String),
                expiration: expect.any(Date),
                createdAt: expect.any(Date),
              }),
            ),
          ]),
        ),
      );

      // Verify original sync data is unchanged
      const syncDocsAfter = await mongoService.sync.find().toArray();

      expect(syncDocsAfter).toHaveLength(count);
    });

    it("is non-destructive - does not modify watch collection on down", async () => {
      // Setup some watch data
      await migration.up(migrationContext);

      const syncDocs = await mongoService.sync.find().toArray();

      // Run down migration
      await migration.down(migrationContext);

      // Verify watch data is unchanged
      const watchDocs = await mongoService.watch.find().toArray();

      expect(watchDocs).toEqual(
        expect.arrayContaining(
          syncDocs.flatMap(({ user, google }) =>
            google.events.map(() =>
              expect.objectContaining({
                _id: expect.any(ObjectId),
                user,
                resourceId: expect.any(String),
                expiration: expect.any(Date),
                createdAt: expect.any(Date),
              }),
            ),
          ),
        ),
      );
    });
  },
);
