/**
 * Tests for the demo data seed migration.
 */
import { Priorities } from "@core/constants/core.constants";
import { Event_Core } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { createMockStorageAdapter } from "@web/__tests__/utils/storage/mock-storage-adapter.util";
import { Task } from "@web/common/types/task.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { demoDataSeedMigration } from "./demo-data-seed";

describe("demoDataSeedMigration", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("seeds demo data when storage is empty", async () => {
    const adapter = createMockStorageAdapter();

    await demoDataSeedMigration.migrate(adapter);

    expect(adapter.putEvents).toHaveBeenCalled();
    expect(adapter.putTasks).toHaveBeenCalled();

    // Verify events were created (7 total: 5 today + 2 someday)
    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    expect(eventsCall).toHaveLength(7);

    // Verify tasks were created for 3 days
    expect(adapter.putTasks).toHaveBeenCalledTimes(3);
  });

  it("skips seeding when events already exist", async () => {
    const adapter = createMockStorageAdapter();
    adapter.getAllEvents.mockResolvedValue([
      {
        _id: "existing-event",
        startDate: "2025-01-15T09:00:00Z",
        endDate: "2025-01-15T10:00:00Z",
        origin: "compass",
        priority: "unassigned",
        user: "user-1",
      } as Event_Core,
    ]);

    await demoDataSeedMigration.migrate(adapter);

    expect(adapter.putEvents).not.toHaveBeenCalled();
    expect(adapter.putTasks).not.toHaveBeenCalled();
  });

  it("skips seeding when tasks already exist", async () => {
    const adapter = createMockStorageAdapter();
    adapter.getAllTasks.mockResolvedValue([
      { ...createMockTask(), dateKey: "2025-01-15" },
    ]);

    await demoDataSeedMigration.migrate(adapter);

    expect(adapter.putEvents).not.toHaveBeenCalled();
    expect(adapter.putTasks).not.toHaveBeenCalled();
  });

  it("creates events with relative dates (not hardcoded)", async () => {
    const adapter = createMockStorageAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    const today = dayjs().toYearMonthDayString();

    // Check that at least one timed event starts today
    const todayEvents = eventsCall.filter(
      (e) => !e.isSomeday && e.startDate.startsWith(today),
    );
    expect(todayEvents.length).toBeGreaterThan(0);
  });

  it("creates tasks for today, yesterday, and tomorrow", async () => {
    const adapter = createMockStorageAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const today = dayjs().toYearMonthDayString();
    const yesterday = dayjs().subtract(1, "day").toYearMonthDayString();
    const tomorrow = dayjs().add(1, "day").toYearMonthDayString();

    const putTasksCalls = adapter.putTasks.mock.calls;
    const dateKeys = putTasksCalls.map((call) => call[0]);

    expect(dateKeys).toContain(today);
    expect(dateKeys).toContain(yesterday);
    expect(dateKeys).toContain(tomorrow);
  });

  it("creates yesterday tasks as completed", async () => {
    const adapter = createMockStorageAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const yesterday = dayjs().subtract(1, "day").toYearMonthDayString();
    const putTasksCalls = adapter.putTasks.mock.calls;
    const yesterdayCall = putTasksCalls.find((call) => call[0] === yesterday);

    expect(yesterdayCall).toBeDefined();
    const yesterdayTasks = yesterdayCall![1] as Task[];
    expect(yesterdayTasks.every((t) => t.status === "completed")).toBe(true);
  });

  it("creates events with all four priorities", async () => {
    const adapter = createMockStorageAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    const priorities = new Set(eventsCall.map((e) => e.priority));

    expect(priorities.has(Priorities.WORK)).toBe(true);
    expect(priorities.has(Priorities.SELF)).toBe(true);
    expect(priorities.has(Priorities.RELATIONS)).toBe(true);
    expect(priorities.has(Priorities.UNASSIGNED)).toBe(true);
  });

  it("creates someday events for week and month", async () => {
    const adapter = createMockStorageAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    const somedayEvents = eventsCall.filter((e) => e.isSomeday);

    expect(somedayEvents).toHaveLength(2);
  });

  it("creates an all-day event for today", async () => {
    const adapter = createMockStorageAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    const allDayEvents = eventsCall.filter((e) => e.isAllDay);

    expect(allDayEvents).toHaveLength(1);
    expect(allDayEvents[0].title).toBe("Deep work day");
  });

  it("creates timed events with offset format and 15-minute-aligned times (no seconds/milliseconds)", async () => {
    const adapter = createMockStorageAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    const timedEvents = eventsCall.filter((e) => !e.isSomeday && !e.isAllDay);

    // RFC3339 offset format: "2026-02-19T16:30:00-08:00" (no milliseconds, offset instead of Z)
    const offsetFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00[+-]\d{2}:\d{2}$/;

    for (const event of timedEvents) {
      expect(event.startDate).toMatch(offsetFormat);
      expect(event.endDate).toMatch(offsetFormat);
      expect(event.startDate).not.toContain(".");
      expect(event.endDate).not.toContain(".");
    }
  });

  it("adds default grid position data to seeded timed events", async () => {
    const adapter = createMockStorageAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    const timedEvents = eventsCall.filter(
      (e) => !e.isSomeday && !e.isAllDay,
    ) as Schema_GridEvent[];

    expect(timedEvents.length).toBeGreaterThan(0);

    for (const event of timedEvents) {
      expect(event.position).toBeDefined();
      expect(event.position).toMatchObject({
        isOverlapping: false,
        totalEventsInGroup: 1,
        widthMultiplier: 1,
        horizontalOrder: 1,
        initialX: null,
        initialY: null,
        dragOffset: { x: 0, y: 0 },
      });
    }
  });
});
