/**
 * Tests for the demo data seed migration.
 */
import { Priorities } from "@core/constants/core.constants";
import { EventSchema } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { createMockOfflineDataStore } from "@web/__tests__/utils/storage/mock-offline-data-store.util";
import { type LocalEventRecord } from "@web/common/storage/types/local-event.record";
import { demoDataSeedMigration } from "./demo-data-seed";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("demoDataSeedMigration", () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleWarnSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("seeds demo data when storage is empty", async () => {
    const store = createMockOfflineDataStore();

    await demoDataSeedMigration.migrate(store);

    expect(store.putEvents).toHaveBeenCalled();
    expect(store.putTasks).toHaveBeenCalled();

    const eventsCall = store.putEvents.mock.calls[0][0] as LocalEventRecord[];
    expect(eventsCall).toHaveLength(5);
    expect(eventsCall.every((record) => record.isDemo)).toBe(true);

    expect(store.putTasks).toHaveBeenCalledTimes(3);
  });

  it("skips seeding when events already exist", async () => {
    const store = createMockOfflineDataStore();
    store.getAllEvents.mockResolvedValue([{ id: "existing" }]);

    await demoDataSeedMigration.migrate(store);

    expect(store.putEvents).not.toHaveBeenCalled();
    expect(store.putTasks).not.toHaveBeenCalled();
  });

  it("skips seeding when tasks already exist", async () => {
    const store = createMockOfflineDataStore();
    store.getAllTasks.mockResolvedValue([
      { ...createMockTask(), dateKey: "2025-01-15" },
    ]);

    await demoDataSeedMigration.migrate(store);

    expect(store.putEvents).not.toHaveBeenCalled();
    expect(store.putTasks).not.toHaveBeenCalled();
  });

  it("creates events with relative dates (not hardcoded)", async () => {
    const store = createMockOfflineDataStore();

    await demoDataSeedMigration.migrate(store);

    const eventsCall = store.putEvents.mock.calls[0][0] as LocalEventRecord[];
    const today = dayjs().toYearMonthDayString();

    const todayEvents = eventsCall.filter(
      ({ event }) =>
        event.schedule.kind === "timed" &&
        event.schedule.start.startsWith(today),
    );
    expect(todayEvents.length).toBeGreaterThan(0);
  });

  it("creates tasks for today, yesterday, and tomorrow", async () => {
    const store = createMockOfflineDataStore();

    await demoDataSeedMigration.migrate(store);

    const today = dayjs().toYearMonthDayString();
    const yesterday = dayjs().subtract(1, "day").toYearMonthDayString();
    const tomorrow = dayjs().add(1, "day").toYearMonthDayString();

    const putTasksCalls = store.putTasks.mock.calls as Array<
      [string, ReturnType<typeof createMockTask>[]]
    >;
    const dateKeys = putTasksCalls.map((call) => call[0]);

    expect(dateKeys).toContain(today);
    expect(dateKeys).toContain(yesterday);
    expect(dateKeys).toContain(tomorrow);
  });

  it("creates yesterday tasks as completed", async () => {
    const store = createMockOfflineDataStore();

    await demoDataSeedMigration.migrate(store);

    const yesterday = dayjs().subtract(1, "day").toYearMonthDayString();
    const putTasksCalls = store.putTasks.mock.calls as Array<
      [string, ReturnType<typeof createMockTask>[]]
    >;
    const yesterdayCall = putTasksCalls.find((call) => call[0] === yesterday);

    if (!yesterdayCall) {
      throw new Error("Expected yesterday tasks to be seeded");
    }
    const yesterdayTasks = yesterdayCall[1];
    expect(yesterdayTasks.every((t) => t.status === "completed")).toBe(true);
  });

  it("creates events with all four priorities", async () => {
    const store = createMockOfflineDataStore();

    await demoDataSeedMigration.migrate(store);

    const eventsCall = store.putEvents.mock.calls[0][0] as LocalEventRecord[];
    const priorities = new Set(eventsCall.map(({ event }) => event.priority));

    expect(priorities.has(Priorities.WORK)).toBe(true);
    expect(priorities.has(Priorities.SELF)).toBe(true);
    expect(priorities.has(Priorities.RELATIONS)).toBe(true);
    expect(priorities.has(Priorities.UNASSIGNED)).toBe(true);
  });

  it("creates an all-day event for today", async () => {
    const store = createMockOfflineDataStore();

    await demoDataSeedMigration.migrate(store);

    const eventsCall = store.putEvents.mock.calls[0][0] as LocalEventRecord[];
    const allDayEvents = eventsCall.filter(
      ({ event }) => event.schedule.kind === "allDay",
    );

    expect(allDayEvents).toHaveLength(1);
    expect(allDayEvents[0].event.content).toMatchObject({
      title: "Deep work day",
    });
  });

  it("creates timed events with offset format and no seconds/milliseconds drift", async () => {
    const store = createMockOfflineDataStore();

    await demoDataSeedMigration.migrate(store);

    const eventsCall = store.putEvents.mock.calls[0][0] as LocalEventRecord[];
    const timedEvents = eventsCall.filter(
      ({ event }) => event.schedule.kind === "timed",
    );

    const offsetFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00[+-]\d{2}:\d{2}$/;

    for (const { event } of timedEvents) {
      if (event.schedule.kind !== "timed") continue;
      expect(event.schedule.start).toMatch(offsetFormat);
      expect(event.schedule.end).toMatch(offsetFormat);
    }
  });

  it("seeds events with a valid Event shape", async () => {
    const store = createMockOfflineDataStore();

    await demoDataSeedMigration.migrate(store);

    const eventsCall = store.putEvents.mock.calls[0][0] as LocalEventRecord[];

    for (const { event } of eventsCall) {
      expect(() => EventSchema.parse(event)).not.toThrow();
    }
  });
});
