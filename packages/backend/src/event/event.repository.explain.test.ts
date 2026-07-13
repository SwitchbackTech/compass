import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { type EventRecord } from "@backend/event/event.record";

/**
 * Query explain regression tests (packet 09 step 5). Not env-gated: explain
 * is cheap and an index/query-shape misalignment is exactly what a release
 * gate should catch before it becomes a p95 regression in production.
 *
 * mongodb-memory-server starts with none of the migration history that
 * creates these indexes on the real `event`/`calendar` collections
 * (packages/scripts/src/migrations/2026.07.10T21.30.00.event-record-backfill.ts
 * and 2026.07.10T21.00.00.calendar-record-migration.ts), so this file
 * recreates that same index set locally. The filters below are hand-copied
 * from event.repository.ts's private `listRange` method
 * (not exercised through the repository, since `.list()` awaits `.toArray()`
 * internally with no way to attach `.explain()`) -- if that filter shape
 * ever changes, update the matching filter here too, so index coverage gets
 * re-verified against the new shape.
 */

type PlanStage = {
  stage?: string;
  indexName?: string;
  inputStage?: PlanStage;
  inputStages?: PlanStage[];
  [key: string]: unknown;
};

/** Depth-first flatten of a MongoDB explain plan tree (FETCH -> IXSCAN, etc). */
function flattenPlan(stage: PlanStage | undefined): PlanStage[] {
  if (!stage) return [];
  return [
    stage,
    ...flattenPlan(stage.inputStage),
    ...(stage.inputStages ?? []).flatMap(flattenPlan),
  ];
}

async function explainWinningPlan(cursor: {
  explain: (verbosity: "executionStats") => Promise<unknown>;
}): Promise<PlanStage[]> {
  const explanation = (await cursor.explain("executionStats")) as {
    queryPlanner: { winningPlan: PlanStage };
  };
  return flattenPlan(explanation.queryPlanner.winningPlan);
}

const expectIndexed = (stages: PlanStage[], indexName: string): void => {
  const ixscan = stages.find((s) => s.stage === "IXSCAN");
  expect(stages.some((s) => s.stage === "COLLSCAN")).toBe(false);
  expect(ixscan).toBeDefined();
  expect(ixscan?.indexName).toBe(indexName);
};

// Mirrors packages/scripts/src/migrations/2026.07.10T21.30.00.event-record-backfill.ts's
// `#applyValidatorAndIndexes` -- only the indexes behind list()'s hot paths.
async function createEventIndexes(): Promise<void> {
  await mongoService.event.createIndex({
    calendarId: 1,
    "schedule.kind": 1,
    "schedule.start": 1,
  });
  await mongoService.event.createIndex({
    calendarId: 1,
    "schedule.kind": 1,
    "schedule.end": 1,
  });
}

// Mirrors packages/scripts/src/migrations/2026.07.10T21.00.00.calendar-record-migration.ts.
async function createCalendarIndexes(): Promise<void> {
  await mongoService.calendar.createIndex(
    { userId: 1, "source.calendarId": 1 },
    {
      name: "calendar_userId_sourceCalendarId_unique",
      unique: true,
      partialFilterExpression: { "source.provider": "google" },
    },
  );
}

const calendarId = new ObjectId();
const otherCalendarId = new ObjectId();

const buildEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  _id: new ObjectId(),
  calendarId,
  content: { kind: "details", title: "Standup", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-07-14T15:00:00.000Z"),
    end: new Date("2026-07-14T16:00:00.000Z"),
    timeZone: "America/Denver",
  },
  recurrence: { kind: "single" },
  priority: "unassigned",
  externalReference: null,
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

/** A few calendars, ~100 events spread across every schedule/recurrence kind. */
async function seedRealisticDataset(): Promise<void> {
  const events: EventRecord[] = [];

  for (let i = 0; i < 40; i++) {
    const day = 1 + (i % 27);
    events.push(
      buildEvent({
        _id: new ObjectId(),
        schedule: {
          kind: "timed",
          start: new Date(Date.UTC(2026, 6, day, 15, 0, 0)),
          end: new Date(Date.UTC(2026, 6, day, 16, 0, 0)),
          timeZone: "America/Denver",
        },
      }),
    );
  }

  for (let i = 0; i < 20; i++) {
    const day = 1 + (i % 27);
    const start = `2026-07-${String(day).padStart(2, "0")}`;
    const end = `2026-07-${String(Math.min(day + 1, 31)).padStart(2, "0")}`;
    events.push(
      buildEvent({
        _id: new ObjectId(),
        schedule: { kind: "allDay", start, end },
      }),
    );
  }

  const series = buildEvent({
    _id: new ObjectId(),
    schedule: {
      kind: "timed",
      start: new Date(Date.UTC(2026, 6, 6, 9, 0, 0)),
      end: new Date(Date.UTC(2026, 6, 6, 9, 30, 0)),
      timeZone: "America/Denver",
    },
    recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=10"] },
  });
  events.push(series);
  for (let i = 0; i < 9; i++) {
    events.push(
      buildEvent({
        _id: new ObjectId(),
        schedule: {
          kind: "timed",
          start: new Date(Date.UTC(2026, 6, 6 + 7 * (i + 1), 9, 0, 0)),
          end: new Date(Date.UTC(2026, 6, 6 + 7 * (i + 1), 9, 30, 0)),
          timeZone: "America/Denver",
        },
        recurrence: { kind: "occurrence", seriesId: series._id },
      }),
    );
  }

  // Noise on other calendars: proves the winning plan bounds on
  // calendarId rather than scanning the whole collection.
  for (let i = 0; i < 15; i++) {
    events.push(
      buildEvent({
        _id: new ObjectId(),
        calendarId: otherCalendarId,
        schedule: {
          kind: "timed",
          start: new Date(Date.UTC(2026, 6, 1 + (i % 27), 15, 0, 0)),
          end: new Date(Date.UTC(2026, 6, 1 + (i % 27), 16, 0, 0)),
          timeZone: "America/Denver",
        },
      }),
    );
  }

  await mongoService.event.insertMany(events);
}

describe("EventRepository query explains (packet 09 step 5)", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  beforeEach(async () => {
    await createEventIndexes();
    await createCalendarIndexes();
    await seedRealisticDataset();
  });
  afterAll(cleanupTestDb);

  describe("list() range query (event.repository.ts::listRange)", () => {
    it("uses an index for the timed-branch window filter", async () => {
      const cursor = mongoService.event.find({
        calendarId: { $in: [calendarId] },
        "schedule.kind": "timed",
        "schedule.start": { $lt: new Date("2026-07-31T00:00:00.000Z") },
        "schedule.end": { $gt: new Date("2026-07-01T00:00:00.000Z") },
      });

      const stages = await explainWinningPlan(cursor);

      expectIndexed(stages, "calendarId_1_schedule.kind_1_schedule.start_1");
    });

    it("uses an index for the all-day-branch window filter", async () => {
      const cursor = mongoService.event.find({
        calendarId: { $in: [calendarId] },
        "schedule.kind": "allDay",
        "schedule.start": { $lt: "2026-07-31" },
        "schedule.end": { $gt: "2026-07-01" },
      });

      const stages = await explainWinningPlan(cursor);

      // Finding: this branch ranges on both schedule.start and
      // schedule.end, and both compound indexes share the identical
      // {calendarId, "schedule.kind"} prefix -- neither one is actually
      // specialized by the *value* of schedule.kind, only by which field
      // is their trailing range key. The planner picks between two
      // legitimate candidates here rather than a single unambiguous
      // winner; empirically (verified across repeated runs) it picks the
      // start-keyed index for this branch too, meaning the dedicated
      // schedule.end index isn't proven to be pulling its weight for the
      // query it looks purpose-built for. Not a regression -- both are
      // real IXSCANs -- but worth a look next time these indexes are
      // tuned. See docs/development/performance-baselines.md.
      expectIndexed(stages, "calendarId_1_schedule.kind_1_schedule.start_1");
    });
  });

  describe("calendar collection primary lookup", () => {
    it("uses an index for {userId, source.provider, source.calendarId}", async () => {
      const userId = new ObjectId();
      await mongoService.calendar.insertOne({
        _id: new ObjectId(),
        userId,
        name: "Primary",
        description: "",
        timeZone: "America/Denver",
        foregroundColor: "#000000",
        backgroundColor: "#ffffff",
        access: "owner",
        isPrimary: true,
        isVisible: true,
        isActive: true,
        source: { provider: "google", calendarId: "primary", etag: "etag-1" },
        createdAt: new Date(),
        updatedAt: null,
      });

      const cursor = mongoService.calendar.find({
        userId,
        "source.provider": "google",
        "source.calendarId": "primary",
      });

      const stages = await explainWinningPlan(cursor);

      expectIndexed(stages, "calendar_userId_sourceCalendarId_unique");
    });
  });
});
