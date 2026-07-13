import { MigratorType } from "@scripts/common/cli.types";
import Migration from "@scripts/migrations/2026.07.13T12.00.00.recurring-series-first-occurrence-repair";
import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { type EventRecord } from "@backend/event/event.record";

const buildBase = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  _id: new ObjectId(),
  calendarId: new ObjectId(),
  content: { kind: "details", title: "Standup", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-07-14T15:00:00.000Z"),
    end: new Date("2026-07-14T16:00:00.000Z"),
    timeZone: "America/Denver",
  },
  recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
  priority: "unassigned",
  externalReference: null,
  createdAt: new Date("2026-07-10T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

const buildOccurrence = (
  base: EventRecord,
  overrides: Partial<EventRecord> = {},
): EventRecord => ({
  _id: new ObjectId(),
  calendarId: base.calendarId,
  content: base.content,
  schedule: base.schedule,
  recurrence: { kind: "occurrence", seriesId: base._id },
  priority: base.priority,
  externalReference: null,
  createdAt: base.createdAt,
  updatedAt: null,
  ...overrides,
});

describe("2026.07.13T12.00.00.recurring-series-first-occurrence-repair", () => {
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
    await expect(migration.up(contextFor(false))).resolves.not.toThrow();
  });

  it("removes an unlinked duplicate occurrence when a linked occurrence already exists at the same start", async () => {
    const base = buildBase({
      externalReference: {
        provider: "google",
        eventId: "g-base",
        recurringEventId: null,
      },
    });
    const linked = buildOccurrence(base, {
      externalReference: {
        provider: "google",
        eventId: "g-instance-1",
        recurringEventId: "g-base",
      },
    });
    const unlinkedDuplicate = buildOccurrence(base);
    await mongoService.event.insertMany([base, linked, unlinkedDuplicate]);

    await migration.up(contextFor(false));

    const remaining = await mongoService.event
      .find({ "recurrence.kind": "occurrence" })
      .toArray();
    expect(remaining.map((r) => r._id.toHexString())).toEqual([
      linked._id.toHexString(),
    ]);
  });

  it("backfills a missing first occurrence for a base that never synced to Google", async () => {
    const base = buildBase();
    await mongoService.event.insertOne(base);

    await migration.up(contextFor(false));

    const occurrences = await mongoService.event
      .find({ "recurrence.kind": "occurrence" })
      .toArray();
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]?.schedule).toEqual(base.schedule);
    expect(occurrences[0]?.externalReference).toBeNull();
  });

  it("does not resurrect a missing first occurrence for a base that already synced to Google", async () => {
    const base = buildBase({
      externalReference: {
        provider: "google",
        eventId: "g-base",
        recurringEventId: null,
      },
    });
    await mongoService.event.insertOne(base);

    await migration.up(contextFor(false));

    const occurrences = await mongoService.event
      .find({ "recurrence.kind": "occurrence" })
      .toArray();
    expect(occurrences).toHaveLength(0);
  });

  it("dry-run reports changes without writing them", async () => {
    const base = buildBase();
    await mongoService.event.insertOne(base);

    await migration.up(contextFor(true));

    const occurrences = await mongoService.event
      .find({ "recurrence.kind": "occurrence" })
      .toArray();
    expect(occurrences).toHaveLength(0);
  });
});
