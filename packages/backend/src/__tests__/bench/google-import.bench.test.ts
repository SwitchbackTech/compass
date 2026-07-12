import { createMockCalendarListEntry } from "@core/__tests__/helpers/gcal.factory";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { compassTestState } from "@backend/__tests__/helpers/mock.setup";
import { generateProductionShapedEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.distribution";
import mongoService from "@backend/common/services/mongo.service";
import { GoogleEventSync } from "@backend/event/google-event-sync.service";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import { performance } from "node:perf_hooks";

/**
 * Import benchmark at 1/5/25 calendars with a production-shaped event mix
 * (packet 09 step 5), plus heap sampling proving memory is batch-bounded
 * rather than proportional to total events (packet 09 step 6).
 *
 * Skipped by default -- CI and `bun run test:backend` never pay for this.
 * Run explicitly and read the `[bench]` summary lines from stdout:
 *
 *   RUN_BENCH=1 TZ=UTC ./node_modules/.bin/jest --selectProjects backend bench
 *
 * See docs/development/performance-baselines.md for the last recorded
 * numbers and the regression-investigation rule.
 */
const describeBench = process.env["RUN_BENCH"] ? describe : describe.skip;

// Generous on purpose (mirrors the migration memory test's rationale at
// packages/scripts/src/migrations/2026.07.10T21.30.00.event-record-backfill.test.ts):
// this asserts memory doesn't scale with total event count, not GC precision.
// Shared CI/dev runners can show a couple hundred MB of GC-timing noise.
const HEAP_BUDGET_MB = 400;

const toMb = (bytes: number) => bytes / (1024 * 1024);

const sampleHeap = (): number => {
  if (global.gc) global.gc();
  return process.memoryUsage().heapUsed;
};

const buildCalendarList = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    createMockCalendarListEntry({
      id: `bench-cal-${i}`,
      summary: `Bench Calendar ${i}`,
      primary: i === 0,
      // Never freeBusyReader: every calendar here should actually import.
      accessRole: i === 0 ? "owner" : i % 2 === 0 ? "reader" : "writer",
    }),
  );

/**
 * Runs one full `initializeGoogleCalendarSync` end-to-end against N
 * synthetic Google calendars sharing one production-shaped event pool
 * (the gcal mock serves `compassTestState().events` globally, not per
 * calendar -- see gcal.factory.ts's `events.list`/`events.instances`
 * handlers -- so every calendar importing the same pool independently is
 * the realistic ceiling this mock infra can produce, not a shortcut).
 */
async function runScenario(
  label: string,
  calendarCount: number,
  eventsPerCalendar: number,
): Promise<void> {
  const user = await UserDriver.createUser();
  const userId = user._id.toString();

  compassTestState().calendarlist = buildCalendarList(calendarCount);

  const { events, expectedImportedCount } =
    generateProductionShapedEvents(eventsPerCalendar);
  compassTestState().events.gcalEvents.all = events;

  // Cheap seam for a per-calendar heap sample: GoogleEventSync.apply runs
  // exactly once per calendar for every scenario here (each calendar's
  // event count stays under the 2500 perPage used by importFull, so
  // gcalService.getAllEvents always yields a single page).
  const originalApply = GoogleEventSync.prototype.apply;
  const heapSamples: number[] = [];
  const applySpy = jest
    .spyOn(GoogleEventSync.prototype, "apply")
    .mockImplementation(async function (
      this: GoogleEventSync,
      ...args: Parameters<typeof originalApply>
    ) {
      const result = await originalApply.call(this, ...args);
      heapSamples.push(sampleHeap());
      return result;
    });

  const baselineHeap = sampleHeap();
  const start = performance.now();

  const result =
    await googleCalendarSyncService.initializeGoogleCalendarSync(userId);

  const durationMs = performance.now() - start;
  const finalHeap = sampleHeap();

  applySpy.mockRestore();

  const expectedTotal = calendarCount * expectedImportedCount;

  expect(result.failedCalendars).toEqual([]);
  expect(result.calendarsCount).toBe(calendarCount);
  expect(result.eventsCount).toBe(expectedTotal);

  const savedDocs = await mongoService.event.countDocuments({});
  expect(savedDocs).toBe(expectedTotal);

  const peakHeap = Math.max(baselineHeap, finalHeap, ...heapSamples);
  const heapDeltaMb = toMb(peakHeap - baselineHeap);

  console.info(
    `[bench] ${label}: calendars=${calendarCount} eventsPerCalendar=${eventsPerCalendar} ` +
      `totalImported=${result.eventsCount} durationMs=${durationMs.toFixed(0)} ` +
      `heapDeltaMb=${heapDeltaMb.toFixed(1)} (budget<${HEAP_BUDGET_MB}, ` +
      `gcExposed=${Boolean(global.gc)})`,
  );

  // Batch-bounded, not total-event-bounded (step 6): if this ever scaled
  // with total imported events instead of per-calendar/per-page batches,
  // the 25-calendar scenario below would blow well past the 1-calendar
  // scenario's delta despite importing fewer events per calendar.
  expect(heapDeltaMb).toBeLessThan(HEAP_BUDGET_MB);
}

describeBench("google-import benchmark (packet 09 steps 5-6)", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("imports 1 calendar x 2000 events", async () => {
    await runScenario("1x2000", 1, 2000);
  }, 90_000);

  it("imports 5 calendars x 800 events", async () => {
    await runScenario("5x800", 5, 800);
  }, 90_000);

  it("imports 25 calendars x 300 events", async () => {
    await runScenario("25x300", 25, 300);
  }, 90_000);
});
