import { MigratorType } from "@scripts/common/cli.types";
import { verifyEventMigration } from "@scripts/common/event-migration.verify";
import Migration from "@scripts/migrations/2026.07.10T21.30.00.event-record-backfill";
import { type Document, ObjectId } from "mongodb";
import { Priorities } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { CalendarRecordSchema } from "@backend/calendar/calendar.record";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

describe("2026.07.10T21.30.00.event-record-backfill", () => {
  const migration = new Migration();
  const destinationName = `${Collections.EVENT}_new`;
  const legacyCollection = () =>
    mongoService.db.collection<Document>(Collections.EVENT);
  const destinationCollection = () =>
    mongoService.db.collection(destinationName);

  const migrationContext = {
    name: migration.name,
    context: {
      logger: Logger("test:migration"),
      migratorType: MigratorType.MIGRATION,
      unsafe: false,
    },
  };

  const insertLocalCalendar = async (userId: ObjectId) => {
    const record = CalendarRecordSchema.parse({
      _id: new ObjectId(),
      userId,
      name: "Compass",
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
    });
    await mongoService.calendar.insertOne(record);
    return record;
  };

  const insertGoogleCalendar = async (
    userId: ObjectId,
    overrides: { timeZone?: string | null; calendarId?: string } = {},
  ) => {
    const record = CalendarRecordSchema.parse({
      _id: new ObjectId(),
      userId,
      name: "Primary",
      description: "",
      timeZone: overrides.timeZone ?? "America/New_York",
      foregroundColor: "#000000",
      backgroundColor: "#9e9e9e",
      access: "owner",
      isPrimary: true,
      isVisible: true,
      isActive: true,
      source: {
        provider: "google",
        calendarId: overrides.calendarId ?? "primary",
        etag: "etag-1",
      },
      createdAt: new Date(),
      updatedAt: null,
    });
    await mongoService.calendar.insertOne(record);
    return record;
  };

  const legacyEvent = (
    userIdHex: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    _id: new ObjectId(),
    user: userIdHex,
    title: "Title",
    description: "Description",
    startDate: new Date("2026-01-01T10:00:00.000Z").toISOString(),
    endDate: new Date("2026-01-01T11:00:00.000Z").toISOString(),
    isAllDay: false,
    isSomeday: false,
    priority: Priorities.UNASSIGNED,
    updatedAt: new Date(),
    ...overrides,
  });

  beforeAll(setupTestDb);
  afterEach(cleanupCollections);
  afterEach(() => legacyCollection().deleteMany({}));
  // cleanupCollections intentionally skips the user collection; this
  // migration iterates every user, so a leftover user without a local
  // calendar from a prior test would abort the next test's run.
  afterEach(() => mongoService.user.deleteMany({}));
  // Drop the destination outright: its validator/index generation must not
  // leak across tests sharing the same in-memory mongod.
  afterEach(() =>
    destinationCollection()
      .drop()
      .catch(() => undefined),
  );
  afterAll(cleanupTestDb);

  describe("up", () => {
    it("no-ops cleanly against a fresh, empty database", async () => {
      await expect(migration.up(migrationContext)).resolves.not.toThrow();
      expect(await destinationCollection().countDocuments()).toBe(0);
    });

    it("throws a clear error if a user has no local calendar", async () => {
      await UserDriver.createUser({ withGoogle: false });

      await expect(migration.up(migrationContext)).rejects.toThrow(
        /has no local calendar/,
      );
    });

    it("sends a password-only user's someday and local timed events to their local calendar", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      const local = await insertLocalCalendar(user._id);

      await legacyCollection().insertMany([
        legacyEvent(user._id.toHexString(), {
          title: "Local timed",
          startDate: new Date("2026-02-01T09:00:00.000Z").toISOString(),
          endDate: new Date("2026-02-01T10:00:00.000Z").toISOString(),
        }),
        legacyEvent(user._id.toHexString(), {
          title: "Someday",
          isSomeday: true,
          startDate: "2026-02-03",
          endDate: "2026-02-03",
        }),
      ]);

      await migration.up(migrationContext);

      const docs = await destinationCollection().find({}).toArray();
      expect(docs).toHaveLength(2);
      for (const doc of docs) {
        expect((doc["calendarId"] as ObjectId).equals(local._id)).toBe(true);
      }

      const timed = docs.find(
        (d) => (d["schedule"] as Document)["kind"] === "timed",
      );
      expect((timed?.["schedule"] as Document)["timeZone"]).toBe("UTC");
    });

    it("migrates the full event category matrix for a Google-connected user", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      await insertLocalCalendar(user._id);
      const google = await insertGoogleCalendar(user._id, {
        timeZone: "America/New_York",
      });
      const userIdHex = user._id.toHexString();

      const seriesBase = legacyEvent(userIdHex, {
        title: "Series base",
        gEventId: "series-base-gid",
        recurrence: { rule: ["FREQ=WEEKLY;COUNT=3"] },
      });

      const occurrence = legacyEvent(userIdHex, {
        title: "Occurrence",
        gEventId: "series-occurrence-gid",
        gRecurringEventId: "series-base-gid",
        recurrence: { eventId: seriesBase._id.toString() },
      });

      const sameDateAllDay = legacyEvent(userIdHex, {
        title: "Same-date all-day",
        isAllDay: true,
        startDate: "2026-03-01",
        endDate: "2026-03-01",
      });

      const multiDayAllDay = legacyEvent(userIdHex, {
        title: "Multi-day all-day",
        isAllDay: true,
        startDate: "2026-03-05",
        endDate: "2026-03-08",
      });

      const somedayWeekExplicitOrder = legacyEvent(userIdHex, {
        title: "Someday week, order 0",
        isSomeday: true,
        startDate: "2026-03-10",
        endDate: "2026-03-11",
        order: 0,
      });

      const somedayMonthMissingOrder = legacyEvent(userIdHex, {
        title: "Someday month, missing order",
        isSomeday: true,
        startDate: "2026-03-15",
        endDate: "2026-04-01",
      });

      const googleTimed = legacyEvent(userIdHex, {
        title: "Google timed",
        gEventId: "regular-gid",
      });

      await legacyCollection().insertMany([
        seriesBase,
        occurrence,
        sameDateAllDay,
        multiDayAllDay,
        somedayWeekExplicitOrder,
        somedayMonthMissingOrder,
        googleTimed,
      ]);

      await migration.up(migrationContext);

      const docs = await destinationCollection().find({}).toArray();
      expect(docs).toHaveLength(7);

      const byId = new Map(
        docs.map((d) => [(d["_id"] as ObjectId).toHexString(), d]),
      );

      // Series base -> series; _id preserved.
      const baseDoc = byId.get(seriesBase._id.toHexString())!;
      expect((baseDoc["recurrence"] as Document)["kind"]).toBe("series");
      expect((baseDoc["calendarId"] as ObjectId).equals(google._id)).toBe(true);
      expect((baseDoc["schedule"] as Document)["timeZone"]).toBe(
        "America/New_York",
      );

      // Occurrence -> seriesId links back to the base's preserved _id.
      const occurrenceDoc = byId.get(occurrence._id.toHexString())!;
      expect((occurrenceDoc["recurrence"] as Document)["kind"]).toBe(
        "occurrence",
      );
      expect(
        (
          (occurrenceDoc["recurrence"] as Document)["seriesId"] as ObjectId
        ).equals(seriesBase._id),
      ).toBe(true);

      // externalReference from top-level gEventId/gRecurringEventId.
      expect(occurrenceDoc["externalReference"]).toMatchObject({
        provider: "google",
        eventId: "series-occurrence-gid",
        recurringEventId: "series-base-gid",
      });

      // Same-date all-day normalizes to an exclusive end (+1 day).
      const sameDateDoc = byId.get(sameDateAllDay._id.toHexString())!;
      expect((sameDateDoc["schedule"] as Document)["start"]).toBe("2026-03-01");
      expect((sameDateDoc["schedule"] as Document)["end"]).toBe("2026-03-02");

      // Multi-day all-day end is unchanged.
      const multiDayDoc = byId.get(multiDayAllDay._id.toHexString())!;
      expect((multiDayDoc["schedule"] as Document)["end"]).toBe("2026-03-08");

      // Someday week with explicit order 0 keeps it.
      const somedayWeekDoc = byId.get(
        somedayWeekExplicitOrder._id.toHexString(),
      )!;
      expect((somedayWeekDoc["schedule"] as Document)["period"]).toBe("week");
      expect((somedayWeekDoc["schedule"] as Document)["sortOrder"]).toBe(0);

      // Someday month with missing order is deterministically renumbered.
      const somedayMonthDoc = byId.get(
        somedayMonthMissingOrder._id.toHexString(),
      )!;
      expect((somedayMonthDoc["schedule"] as Document)["period"]).toBe("month");
      expect(
        typeof (somedayMonthDoc["schedule"] as Document)["sortOrder"],
      ).toBe("number");

      // Google timed event lands on the primary Google calendar with its zone.
      const googleTimedDoc = byId.get(googleTimed._id.toHexString())!;
      expect(
        (googleTimedDoc["calendarId"] as ObjectId).equals(google._id),
      ).toBe(true);
      expect((googleTimedDoc["schedule"] as Document)["timeZone"]).toBe(
        "America/New_York",
      );
    });

    it("throws on malformed rows, naming each failure reason, and leaves legacy data untouched", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      await insertLocalCalendar(user._id);
      const userIdHex = user._id.toHexString();

      const endBeforeStart = legacyEvent(userIdHex, {
        title: "Bad dates",
        isAllDay: true,
        startDate: "2026-04-05",
        endDate: "2026-04-01",
      });

      const flagDateMismatch = legacyEvent(userIdHex, {
        title: "Flag mismatch",
        isAllDay: true,
        startDate: new Date("2026-04-01T10:00:00.000Z").toISOString(),
        endDate: new Date("2026-04-01T11:00:00.000Z").toISOString(),
      });

      const recurrenceConflict = legacyEvent(userIdHex, {
        title: "Recurrence conflict",
        recurrence: {
          rule: ["FREQ=DAILY"],
          eventId: new ObjectId().toString(),
        },
      });

      const missingBase = legacyEvent(userIdHex, {
        title: "Missing base",
        recurrence: { eventId: new ObjectId().toString() },
      });

      await legacyCollection().insertMany([
        endBeforeStart,
        flagDateMismatch,
        recurrenceConflict,
        missingBase,
      ]);

      const legacyBefore = await legacyCollection().find({}).toArray();

      await expect(migration.up(migrationContext)).rejects.toThrow(
        /Event backfill aborted/,
      );

      const legacyAfter = await legacyCollection().find({}).toArray();
      expect(legacyAfter).toEqual(legacyBefore);
    });

    it("throws when two legacy events share a gEventId on the same calendar (duplicate detection via the unique index)", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      await insertLocalCalendar(user._id);
      await insertGoogleCalendar(user._id);
      const userIdHex = user._id.toHexString();

      await legacyCollection().insertMany([
        legacyEvent(userIdHex, { title: "First", gEventId: "dup-gid" }),
        legacyEvent(userIdHex, { title: "Second", gEventId: "dup-gid" }),
      ]);

      await expect(migration.up(migrationContext)).rejects.toThrow(
        /Event backfill aborted/,
      );
    });

    it("converges on rerun after an initial successful run (no duplicates)", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      await insertLocalCalendar(user._id);
      const userIdHex = user._id.toHexString();

      await legacyCollection().insertMany([
        legacyEvent(userIdHex, { title: "A" }),
        legacyEvent(userIdHex, {
          title: "B",
          isSomeday: true,
          startDate: "2026-05-01",
          endDate: "2026-05-02",
        }),
      ]);

      await migration.up(migrationContext);
      const firstPass = await destinationCollection().find({}).toArray();

      await expect(migration.up(migrationContext)).resolves.not.toThrow();
      const secondPass = await destinationCollection().find({}).toArray();

      expect(secondPass).toHaveLength(firstPass.length);
      expect(secondPass).toEqual(firstPass);
    });

    it("creates the final index set", async () => {
      await migration.up(migrationContext);

      const indexes = await destinationCollection().listIndexes().toArray();
      const names = indexes.map((i) => i.name);

      expect(names).toEqual(
        expect.arrayContaining([
          "event_calendar_someday_order",
          "event_recurrence_seriesId",
          "event_calendar_externalReference_unique",
        ]),
      );

      const startIndex = indexes.find(
        (i) =>
          JSON.stringify(i.key) ===
          JSON.stringify({
            calendarId: 1,
            "schedule.kind": 1,
            "schedule.start": 1,
          }),
      );
      expect(startIndex).toBeDefined();
    });
  });

  describe("down", () => {
    it("is a non-destructive no-op", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      await insertLocalCalendar(user._id);
      await legacyCollection().insertOne(legacyEvent(user._id.toHexString()));

      await migration.up(migrationContext);
      const before = await destinationCollection().find({}).toArray();

      await migration.down(migrationContext);

      const after = await destinationCollection().find({}).toArray();
      expect(after).toEqual(before);
      expect(await legacyCollection().countDocuments()).toBe(1);
    });
  });

  describe("verifyEventMigration", () => {
    it("reports ok:false with a named mismatch when a destination row is corrupted", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      const local = await insertLocalCalendar(user._id);
      const userIdHex = user._id.toHexString();

      await legacyCollection().insertOne(legacyEvent(userIdHex));
      await migration.up(migrationContext);

      const [doc] = await destinationCollection().find({}).toArray();
      await destinationCollection().updateOne(
        { _id: doc!["_id"] },
        { $set: { calendarId: new ObjectId() } },
      );

      const result = await verifyEventMigration({
        legacyCollection: legacyCollection(),
        destinationCollection: destinationCollection() as never,
        calendarCollection: mongoService.calendar as never,
        localCalendarIdByUser: new Map([[userIdHex, local._id]]),
        primaryGoogleCalendarByUser: new Map([[userIdHex, null]]),
        legacyBaseIdsByUser: new Map([[userIdHex, new Set()]]),
        legacyUserOf: (d) =>
          typeof (d as Document)["user"] === "string"
            ? ((d as Document)["user"] as string)
            : null,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.mismatches.some((m) => m.includes("orphan calendarId")),
        ).toBe(true);
      }
    });
  });

  describe("memory boundedness", () => {
    it("keeps heap growth bounded while backfilling ~20k events for one user", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      await insertLocalCalendar(user._id);
      const userIdHex = user._id.toHexString();

      const total = 20_000;
      const chunkSize = 2_000;
      for (let inserted = 0; inserted < total; inserted += chunkSize) {
        const chunk = Array.from(
          { length: Math.min(chunkSize, total - inserted) },
          (_, i) => {
            const day = 1 + ((inserted + i) % 25);
            const date = `2026-06-${String(day).padStart(2, "0")}`;
            return legacyEvent(userIdHex, {
              title: `Bulk ${inserted + i}`,
              startDate: new Date(`${date}T09:00:00.000Z`).toISOString(),
              endDate: new Date(`${date}T10:00:00.000Z`).toISOString(),
            });
          },
        );
        // eslint-disable-next-line no-await-in-loop -- intentionally
        // streaming inserts so the fixture itself never holds all 20k
        // documents in memory at once.
        await legacyCollection().insertMany(chunk);
      }

      if (global.gc) global.gc();
      const before = process.memoryUsage().heapUsed;

      await migration.up(migrationContext);

      if (global.gc) global.gc();
      const after = process.memoryUsage().heapUsed;
      const growthMb = (after - before) / (1024 * 1024);

      expect(await destinationCollection().countDocuments()).toBe(total);
      // Guards against accumulation proportional to the dataset (which would
      // measure in gigabytes at this fixture size), not GC precision: shared
      // CI runners have shown 245-296 MB of GC-timing noise for the same code.
      expect(growthMb).toBeLessThan(400);
    }, 120_000);
  });
});
