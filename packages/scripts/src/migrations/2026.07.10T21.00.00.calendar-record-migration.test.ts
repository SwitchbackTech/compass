import { MigratorType } from "@scripts/common/cli.types";
import CalendarSchemaMigration from "@scripts/migrations/2025.10.03T01.19.59.calendar-schema";
import CalendarUpdateMigration from "@scripts/migrations/2025.10.14T12.24.01.update-calendar-schema";
import CalendarListMigration from "@scripts/migrations/2025.10.16T12.26.00.migrate-calendarlist-to-calendar";
import Migration from "@scripts/migrations/2026.07.10T21.00.00.calendar-record-migration";
import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { IS_DEV } from "@backend/common/constants/config.constants";
import mongoService from "@backend/common/services/mongo.service";

describe("2026.07.10T21.00.00.calendar-record-migration", () => {
  const migration = new Migration();
  const oldCollectionListName = IS_DEV ? "_dev.calendarlist" : "calendarlist";

  const migrationContext = {
    name: migration.name,
    context: {
      logger: Logger("test:migration"),
      migratorType: MigratorType.MIGRATION,
      unsafe: false,
    },
  };

  // Reproduces a realistic legacy `calendar` collection (user/metadata shape)
  // by running the real 2025 migration chain over generated calendarlist
  // data, exactly as production data arrived at this migration's precondition.
  async function seedLegacyCalendars(numUsers: number) {
    await CalendarSchemaMigration.prototype.up();
    await CalendarUpdateMigration.prototype.up();
    await CalendarDriver.generateV0Data(numUsers);
    await CalendarListMigration.prototype.up(migrationContext);
  }

  beforeAll(setupTestDb);
  afterEach(cleanupCollections);
  afterEach(() =>
    mongoService.db.collection(oldCollectionListName).deleteMany(),
  );
  // cleanupCollections intentionally skips the user collection; drop it too
  // so each test starts with a clean user set.
  afterEach(() => mongoService.user.deleteMany({}));
  // Drop the collection outright (not just its documents): each test may
  // leave behind a different validator/index generation (legacy strict
  // schema vs. this migration's final shape), and those must not leak
  // across tests sharing the same in-memory mongod.
  afterEach(() => mongoService.calendar.drop().catch(() => undefined));
  afterAll(cleanupTestDb);

  describe("up", () => {
    it("no-ops cleanly against a fresh, empty database", async () => {
      await expect(migration.up(migrationContext)).resolves.not.toThrow();

      const calendars = await mongoService.calendar.find().toArray();
      expect(calendars).toHaveLength(0);
    });

    it("creates a Compass-local calendar for a password-only user with no calendar rows", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });

      await migration.up(migrationContext);

      const calendars = await mongoService.calendar
        .find({ userId: user._id })
        .toArray();

      expect(calendars).toHaveLength(1);
      expect(calendars[0]).toMatchObject({
        userId: user._id,
        source: { provider: "local" },
        isActive: true,
        isPrimary: false,
      });
    });

    it("renames legacy Google calendar fields, preserves _id and selected->isVisible, and adds a local calendar", async () => {
      await seedLegacyCalendars(2);

      const legacyCalendars = await mongoService.calendar.find().toArray();
      expect(legacyCalendars.length).toBeGreaterThan(0);

      await migration.up(migrationContext);

      const migrated = await mongoService.calendar.find().toArray();

      for (const legacy of legacyCalendars) {
        const record = migrated.find((c) => c._id.equals(legacy._id));
        expect(record).toBeDefined();
        expect(record).toMatchObject({
          _id: legacy._id,
          userId: legacy.user,
          isVisible: legacy.selected,
          isPrimary: legacy.primary,
          source: {
            provider: "google",
            calendarId: legacy.metadata.id,
            etag: legacy.metadata.etag,
          },
        });
      }

      // One local calendar per user, in addition to the renamed Google rows.
      const localCalendars = migrated.filter(
        (c) => c.source.provider === "local",
      );
      const userIds = new Set(legacyCalendars.map((c) => c.user.toHexString()));
      expect(localCalendars).toHaveLength(userIds.size);
    });

    it("aborts the transaction and throws on a malformed calendar row, leaving legacy data untouched", async () => {
      await seedLegacyCalendars(1);
      const before = await mongoService.calendar.find().toArray();

      // Bypass the still-active legacy validator to simulate a corrupt row
      // (missing provider identity) that the transform must reject.
      await mongoService.calendar.updateOne(
        { _id: before[0]!._id },
        { $unset: { "metadata.etag": "" } },
        { bypassDocumentValidation: true },
      );

      await expect(migration.up(migrationContext)).rejects.toThrow(
        /Calendar migration aborted/,
      );

      // Fail-closed: none of this run's writes should have committed.
      const after = await mongoService.calendar.find().toArray();
      expect(after).toHaveLength(before.length);
      expect(after.every((c) => "user" in c)).toBe(true);
    });

    it("is idempotent: a rerun over already-migrated data changes nothing", async () => {
      await seedLegacyCalendars(2);
      await migration.up(migrationContext);

      const firstPass = await mongoService.calendar.find().toArray();

      await expect(migration.up(migrationContext)).resolves.not.toThrow();

      const secondPass = await mongoService.calendar.find().toArray();
      expect(secondPass).toEqual(firstPass);
    });

    it("creates the final index set", async () => {
      await migration.up(migrationContext);

      const indexes = await mongoService.calendar.listIndexes().toArray();
      const names = indexes.map((i) => i.name);

      expect(names).toEqual(
        expect.arrayContaining([
          "calendar_userId_local_unique",
          "calendar_userId_googlePrimary_unique",
          "calendar_userId_sourceCalendarId_unique",
        ]),
      );

      const byUserId = indexes.find(
        (i) => JSON.stringify(i.key) === JSON.stringify({ userId: 1 }),
      );
      expect(byUserId).toBeDefined();

      const activeVisible = indexes.find(
        (i) =>
          JSON.stringify(i.key) ===
          JSON.stringify({ userId: 1, isActive: 1, isVisible: 1 }),
      );
      expect(activeVisible).toBeDefined();
    });

    it("enforces at most one local calendar per user via the partial unique index", async () => {
      await migration.up(migrationContext);
      const user = await UserDriver.createUser({ withGoogle: false });
      await migration.up(migrationContext);

      const localCalendars = await mongoService.calendar
        .find({ userId: user._id, "source.provider": "local" })
        .toArray();
      expect(localCalendars).toHaveLength(1);

      await expect(
        mongoService.calendar.insertOne({
          _id: new ObjectId(),
          userId: user._id,
          name: "Duplicate Local",
          description: "",
          timeZone: null,
          foregroundColor: "#000000",
          backgroundColor: "#9e9e9e",
          access: "owner",
          isPrimary: false,
          isVisible: true,
          isActive: true,
          source: { provider: "local" },
          createdAt: new Date(),
          updatedAt: null,
        }),
      ).rejects.toThrow();
    });
  });

  describe("down", () => {
    it("is a non-destructive no-op", async () => {
      await seedLegacyCalendars(1);
      await migration.up(migrationContext);
      const before = await mongoService.calendar.find().toArray();

      await migration.down(migrationContext);

      const after = await mongoService.calendar.find().toArray();
      expect(after).toEqual(before);
    });
  });
});
