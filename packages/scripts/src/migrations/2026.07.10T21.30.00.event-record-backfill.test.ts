import { MigratorType } from "@scripts/common/cli.types";
import { verifyEventMigration } from "@scripts/common/event-migration.verify";
import NewEventsCollectionMigration from "@scripts/migrations/2025.10.18T19.43.00.new-events-collection";
import CalendarRecordMigration from "@scripts/migrations/2026.07.10T21.00.00.calendar-record-migration";
import Migration from "@scripts/migrations/2026.07.10T21.30.00.event-record-backfill";
import {
  type AnyBulkWriteOperation,
  type BulkWriteOptions,
  type BulkWriteResult,
  Collection,
  type Document,
  ObjectId,
} from "mongodb";
import { MongoDBStorage, Umzug } from "umzug";
import { Priorities } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { CalendarRecordSchema } from "@backend/calendar/calendar.record";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
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
      dryRun: false,
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

    it("sends a password-only user's local timed event to their local calendar and excludes their someday event", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      const local = await insertLocalCalendar(user._id);

      const timedEvent = legacyEvent(user._id.toHexString(), {
        title: "Local timed",
        startDate: new Date("2026-02-01T09:00:00.000Z").toISOString(),
        endDate: new Date("2026-02-01T10:00:00.000Z").toISOString(),
      });
      const somedayEvent = legacyEvent(user._id.toHexString(), {
        title: "Someday",
        isSomeday: true,
        startDate: "2026-02-03",
        endDate: "2026-02-03",
      });

      await legacyCollection().insertMany([timedEvent, somedayEvent]);

      await migration.up(migrationContext);

      const docs = await destinationCollection().find({}).toArray();
      // Only the timed event is migrated; the someday event is excluded.
      expect(docs).toHaveLength(1);
      const [timed] = docs;
      expect((timed?.["_id"] as ObjectId).equals(timedEvent._id)).toBe(true);
      expect((timed?.["calendarId"] as ObjectId).equals(local._id)).toBe(true);
      expect((timed?.["schedule"] as Document)["kind"]).toBe("timed");
      expect((timed?.["schedule"] as Document)["timeZone"]).toBe("UTC");

      // The someday event never reaches the destination.
      const excluded = await destinationCollection().findOne({
        _id: somedayEvent._id,
      });
      expect(excluded).toBeNull();
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

      // These two someday events are intentionally excluded from the
      // destination (the Someday feature was removed); they must NOT appear in
      // event_new even though they belong to the same user.
      const somedayWeek = legacyEvent(userIdHex, {
        title: "Someday week",
        isSomeday: true,
        startDate: "2026-03-10",
        endDate: "2026-03-11",
      });

      const somedayMonth = legacyEvent(userIdHex, {
        title: "Someday month",
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
        somedayWeek,
        somedayMonth,
        googleTimed,
      ]);

      await migration.up(migrationContext);

      const docs = await destinationCollection().find({}).toArray();
      // Seven legacy events, two of them someday: only five are migrated.
      expect(docs).toHaveLength(5);

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

      // Both someday events are excluded, so neither reaches the destination.
      expect(byId.has(somedayWeek._id.toHexString())).toBe(false);
      expect(byId.has(somedayMonth._id.toHexString())).toBe(false);

      // Google timed event lands on the primary Google calendar with its zone.
      const googleTimedDoc = byId.get(googleTimed._id.toHexString())!;
      expect(
        (googleTimedDoc["calendarId"] as ObjectId).equals(google._id),
      ).toBe(true);
      expect((googleTimedDoc["schedule"] as Document)["timeZone"]).toBe(
        "America/New_York",
      );
    });

    it("excludes a mix of someday events, migrates timed/allDay, reports the excluded count, and verifies cleanly", async () => {
      // Regression for the Someday-removal cutover: legacy someday events are
      // counted and dropped rather than migrated, the timed/allDay events for
      // the same user are migrated, the backfill logs the excluded count, and
      // the independent verifier reconciles that count (up() throws on any
      // verification mismatch, including an excluded-count divergence).
      const user = await UserDriver.createUser({ withGoogle: false });
      const local = await insertLocalCalendar(user._id);
      const userIdHex = user._id.toHexString();

      const timed = legacyEvent(userIdHex, {
        title: "Timed",
        startDate: new Date("2026-03-01T09:00:00.000Z").toISOString(),
        endDate: new Date("2026-03-01T10:00:00.000Z").toISOString(),
      });
      const allDay = legacyEvent(userIdHex, {
        title: "All day",
        isAllDay: true,
        startDate: "2026-03-05",
        endDate: "2026-03-08",
      });
      const somedayA = legacyEvent(userIdHex, {
        title: "Someday A",
        isSomeday: true,
        startDate: "2026-03-10",
        endDate: "2026-03-11",
      });
      const somedayB = legacyEvent(userIdHex, {
        title: "Someday B",
        isSomeday: true,
        startDate: "2026-03-15",
        endDate: "2026-04-01",
      });

      const logger = Logger("test:migration:excluded");
      const infoSpy = jest.spyOn(logger, "info");

      await legacyCollection().insertMany([timed, allDay, somedayA, somedayB]);

      // Throws on any verification mismatch (including an excluded-count
      // divergence between backfill and verifier), so completing without
      // throwing already proves verification reconciled the two someday drops.
      await migration.up({
        ...migrationContext,
        context: { ...migrationContext.context, logger },
      });

      // (a) The someday events are absent from event_new.
      expect(
        await destinationCollection().findOne({ _id: somedayA._id }),
      ).toBeNull();
      expect(
        await destinationCollection().findOne({ _id: somedayB._id }),
      ).toBeNull();

      // (b) The timed/allDay events are present.
      const docs = await destinationCollection().find({}).toArray();
      expect(docs).toHaveLength(2);
      const ids = docs.map((d) => (d["_id"] as ObjectId).toHexString());
      expect(ids).toEqual(
        expect.arrayContaining([
          timed._id.toHexString(),
          allDay._id.toHexString(),
        ]),
      );
      for (const doc of docs) {
        expect((doc["calendarId"] as ObjectId).equals(local._id)).toBe(true);
      }

      // (c) The migration logs the correct excludedSomeday count.
      const scanLog = infoSpy.mock.calls
        .map((c) => String(c[0]))
        .find((line) => line.includes("Event backfill scan complete"));
      expect(scanLog).toContain("excludedSomeday=2");

      infoSpy.mockRestore();
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
          "event_recurrence_seriesId",
          "event_calendar_externalReference_unique",
        ]),
      );
      // The someday-order index is no longer created (Someday feature removed).
      expect(names).not.toContain("event_calendar_someday_order");

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

  describe("interrupted-partial-backfill resume (packet 09 step 3)", () => {
    // This migration has no incremental checkpoint to resume from: `up`
    // unconditionally does `destination.deleteMany({})` before writing
    // anything (see the top of the migration), so its only recovery
    // strategy -- for a clean rerun AND for a rerun after a mid-run crash --
    // is "wipe and rebuild from the untouched legacy source". That makes an
    // injected crash the honest simulation here (per the packet's seam
    // guidance) rather than hand-authoring a "checkpoint" shape the
    // implementation doesn't have: it exercises the real per-batch write
    // seam (`flush`'s `destination.bulkWrite` call) and proves the
    // wipe-and-rebuild recovery actually converges from a ragged,
    // mid-batch-written state, not just from a clean prior success (already
    // covered by the "converges on rerun" test above).
    it("converges with no duplicates after a mid-run bulkWrite crash, on the next run", async () => {
      const userA = await UserDriver.createUser({ withGoogle: false });
      await insertLocalCalendar(userA._id);
      const userAHex = userA._id.toHexString();

      const userB = await UserDriver.createUser({ withGoogle: false });
      await insertLocalCalendar(userB._id);
      const userBHex = userB._id.toHexString();

      // One full batch plus a one-event remainder -- guarantees exactly two
      // `bulkWrite` calls per user (batch flush mid-loop, remainder flush
      // after) regardless of what MONGO_BATCH_SIZE resolves to in this test
      // environment (mocked to a small value; see mock.setup.ts).
      const eventsPerUser = MONGO_BATCH_SIZE + 1;
      const makeEvents = (userIdHex: string, label: string) =>
        Array.from({ length: eventsPerUser }, (_, i) => {
          const day = 1 + (i % 25);
          const date = `2026-06-${String(day).padStart(2, "0")}`;
          return legacyEvent(userIdHex, {
            title: `${label} ${i}`,
            startDate: new Date(`${date}T09:00:00.000Z`).toISOString(),
            endDate: new Date(`${date}T10:00:00.000Z`).toISOString(),
          });
        });

      await legacyCollection().insertMany(makeEvents(userAHex, "A"));
      await legacyCollection().insertMany(makeEvents(userBHex, "B"));

      // Users are processed in `mongoService.user.find({})` order and each
      // contributes exactly 2 bulkWrite calls (batch + remainder), so call
      // #3 is always the first user's-worth-of-writes into the second
      // user's processing -- crashing there always leaves exactly one
      // user's events durably written and the other user's entirely
      // unwritten, regardless of which user Mongo iterates first.
      const originalBulkWrite = Collection.prototype.bulkWrite;
      let bulkWriteCallCount = 0;
      const bulkWriteSpy = jest
        .spyOn(Collection.prototype, "bulkWrite")
        .mockImplementation(function (
          this: Collection,
          operations: ReadonlyArray<AnyBulkWriteOperation<Document>>,
          options?: BulkWriteOptions,
        ): Promise<BulkWriteResult> {
          bulkWriteCallCount += 1;
          if (bulkWriteCallCount === 3) {
            return Promise.reject(
              new Error("simulated process crash mid-batch-write"),
            );
          }
          return originalBulkWrite.call(this, operations, options);
        });

      try {
        await expect(migration.up(migrationContext)).rejects.toThrow(
          /simulated process crash/,
        );
      } finally {
        bulkWriteSpy.mockRestore();
      }

      // Crash left a ragged state: exactly one user's worth of events
      // durably written (2 successful flushes), the other user's first
      // batch never attempted.
      expect(await destinationCollection().countDocuments()).toBe(
        eventsPerUser,
      );

      // Resume = simply rerunning the migration. bulkWrite is real again, so
      // this is an ordinary full run against the ragged state left above.
      await expect(migration.up(migrationContext)).resolves.not.toThrow();

      const afterResume = await destinationCollection().find({}).toArray();
      expect(afterResume).toHaveLength(eventsPerUser * 2);

      const ids = afterResume.map((d) => (d["_id"] as ObjectId).toHexString());
      expect(new Set(ids).size).toBe(ids.length);
    }, 30_000);
  });

  describe("event_new migration already recorded (packet 09 step 3, umzug chain)", () => {
    const migrationsCollectionName = `${MigratorType.MIGRATION.toLowerCase()}s`;
    const storageCollection = () =>
      mongoService.db.collection(migrationsCollectionName);

    afterEach(() =>
      storageCollection()
        .drop()
        .catch(() => undefined),
    );

    // Mirrors commands/migrate.ts's production wiring (Umzug + MongoDBStorage
    // over a `migrations` collection) rather than hand-rolling a parallel
    // migration list -- `migrations()` there isn't exported, so this
    // constructs the same three-migration slice of the real chain directly
    // from the migration classes themselves. Returns the storage alongside
    // the umzug instance (rather than reaching into `umzug`'s private
    // `storage` field) so the test can pre-seed it through Umzug's own
    // public UmzugStorage API.
    const buildUmzug = () => {
      const storage = new MongoDBStorage({ collection: storageCollection() });
      const umzug = new Umzug<typeof migrationContext.context>({
        storage,
        logger: undefined,
        migrations: [
          new NewEventsCollectionMigration(),
          new CalendarRecordMigration(),
          migration,
        ],
        context: async () => migrationContext.context,
      });

      return { umzug, storage };
    };

    it("skips the already-recorded new-events-collection migration and still completes the later backfill", async () => {
      // Simulate a prior deployment: the 2025.10.18 migration already ran
      // for real (creating event_new in its old, now-superseded shape) and
      // Umzug's changelog already has it recorded as executed.
      // NewEventsCollectionMigration#up ignores its params entirely (it
      // takes none -- see the migration source), matching how the sibling
      // 2025.10.18T19.43.00.new-events-collection.test.ts drives it too.
      const priorDeploymentMigration = new NewEventsCollectionMigration();
      await priorDeploymentMigration.up();

      const { umzug, storage } = buildUmzug();
      await storage.logMigration({ name: priorDeploymentMigration.name });

      const user = await UserDriver.createUser({ withGoogle: false });
      await legacyCollection().insertOne(
        legacyEvent(user._id.toHexString(), { title: "Chain event" }),
      );

      const executed = await umzug.up();
      const executedNames = executed.map((m) => m.name);

      expect(executedNames).not.toContain(priorDeploymentMigration.name);
      expect(executedNames).toContain(migration.name);
      expect(executedNames).toContain(
        "2026.07.10T21.00.00.calendar-record-migration",
      );

      // The later backfill wasn't broken by inheriting event_new from the
      // already-skipped migration: it converged to its own final shape.
      const docs = await destinationCollection().find({}).toArray();
      expect(docs).toHaveLength(1);
      expect((docs[0]?.["content"] as Document)["title"]).toBe("Chain event");

      const indexNames = (
        await destinationCollection().listIndexes().toArray()
      ).map((i) => i.name);
      expect(indexNames).toEqual(
        expect.arrayContaining(["event_calendar_externalReference_unique"]),
      );
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
